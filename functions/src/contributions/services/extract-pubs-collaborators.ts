import cheerio from "cheerio";
import { firestore } from "firebase-admin";
import * as functions from "firebase-functions";
import * as https from "https";
import fetch from "node-fetch";
import { FirestoreInstance } from "../../utils/configuration";
import { randomIdGenerator } from "../../utils/random-id-generator";
import { ContributionModel } from "../models/contribution.model";
import { PubWatcher, UpdatePubWatcherDate } from "../models/pub-watcher.model";

const agent = new https.Agent({
    rejectUnauthorized: false
});

/**
 * scrap pub and obtain all collaborators, contributors, and any kind of collaboration
 * 
 * runs every 10 minutes, and scraps 5 every 20 mins
 */
export const CONTRIBUTIONS_extractPubCollaborators = functions.pubsub.schedule('*/20 * * * *')
    .onRun(async (context) => {
        const batch = FirestoreInstance.batch();

        /// get all collections
        const query = FirestoreInstance
            .collection('contributions')
            .doc('_configuration_')
            .collection('pubs-watchers')
            .orderBy(<keyof PubWatcher>'scrapedAt', 'asc')
            .limit(5) as firestore.Query<PubWatcher>;

        const { docs } = await query.get();

        const tasks = docs.map(async pubWatcherRef => {
            /// update scraped date
            batch.update(pubWatcherRef.ref, <UpdatePubWatcherDate>{ scrapedAt: firestore.FieldValue.serverTimestamp() });

            const pubWatcherData: PubWatcher | null = pubWatcherRef.data() ?? null;

            if (!pubWatcherData) {
                console.error(`empty pub watcher doc ${pubWatcherRef.ref.path}`);
                return;
            }

            /// scrap the url for all pubs
            const page = await fetch(pubWatcherData.pubUrl, { agent });
            const html = await page.text();
            const $ = cheerio.load(html);
            const viewData = JSON.parse($('#view-data').attr('data-json') ?? '{}')

            // validate view data exists
            const pubData = viewData?.pubData ?? null;

            if (!pubData) {
                console.error(`no page data found ${pubWatcherData.pubUrl}`);
                return;
            }

            /// scrap collaboration only when document has changed
            batch.update(pubWatcherRef.ref, <UpdatePubWatcherDate>{ lastActivity: pubData.updatedAt });
            if (pubWatcherData.lastActivity === pubData.updatedAt)
                return;

            /// save attributions
            if (!!pubData.attributions)
                await saveAttributions(batch, pubWatcherData, pubData.attributions);

            /// save editions to the doc
            if (!!pubData.reviews)
                await saveReviews(batch, pubWatcherData, pubData.reviews);

            /// save discussions to the doc
            if (!!pubData.discussions)
                await saveDiscussions(batch, pubWatcherData, pubData.discussions);

            /// save discusiones
        });
        await Promise.all(tasks);
        await batch.commit();
    });

async function saveAttributions(batch: firestore.WriteBatch, pubWatcherData: PubWatcher, attributions: Array<any>): Promise<void> {
    const tasks = attributions.map(async (attribution) => {
        const contribution: ContributionModel = {
            actionId: attribution.id,
            cityId: pubWatcherData.cityId,
            createdDate: firestore.FieldValue.serverTimestamp(),
            id: randomIdGenerator(20),
            isMedalAwarded: false,
            kind: 'CONTRIBUTION#ATTRIBUTION',
            pubId: pubWatcherData.pubId,
            pubSlug: pubWatcherData.pubSlug,
            pubTitle: pubWatcherData.title,
            pubUrl: pubWatcherData.pubUrl,
            pubUserId: attribution.user.id,
            pubUserSlug: attribution.user.slug,
        };

        await createContribution(batch, contribution);
    });
    await Promise.all(tasks)
}
async function saveReviews(batch: firestore.WriteBatch, pubWatcherData: PubWatcher, reviews: Array<any>): Promise<void> {
    const tasks = reviews.map(async (review) => {
        /// review not completed yet
        if (review.status !== 'completed')
            return;

        const contribution: ContributionModel = {
            actionId: review.id,
            cityId: pubWatcherData.cityId,
            createdDate: firestore.FieldValue.serverTimestamp(),
            id: randomIdGenerator(20),
            isMedalAwarded: false,
            kind: 'CONTRIBUTION#EDITED',
            pubId: pubWatcherData.pubId,
            pubSlug: pubWatcherData.pubSlug,
            pubTitle: pubWatcherData.title,
            pubUrl: pubWatcherData.pubUrl,
            pubUserId: review.author.id,
            pubUserSlug: review.author.slug,
        };

        await createContribution(batch, contribution);
    });
    await Promise.all(tasks)
}

async function saveDiscussions(batch: firestore.WriteBatch, pubWatcherData: PubWatcher, discussions: Array<any>): Promise<void> {
    const discussionTasks = discussions.map(async (discussion) => {
        if (!discussion?.thread?.comments)
            return;

        /// when thread exists
        const threadTasks = (discussion.thread.comments as Array<any>).map(async (comment) => {
            const contribution: ContributionModel = {
                actionId: comment.id,
                cityId: pubWatcherData.cityId,
                createdDate: firestore.FieldValue.serverTimestamp(),
                id: randomIdGenerator(20),
                isMedalAwarded: false,
                kind: 'CONTRIBUTION#DISCUSSION',
                pubId: pubWatcherData.pubId,
                pubSlug: pubWatcherData.pubSlug,
                pubTitle: pubWatcherData.title,
                pubUrl: pubWatcherData.pubUrl,
                pubUserId: comment.author.id,
                pubUserSlug: comment.author.slug,
            };

            await createContribution(batch, contribution);
        });
        await Promise.all(threadTasks)
    });
    await Promise.all(discussionTasks)
}

async function createContribution(batch: firestore.WriteBatch, payload: ContributionModel): Promise<void> {
    /// search if already added 
    const query = FirestoreInstance.collection('contributions')
        .where(<keyof ContributionModel>'cityId', '==', payload.cityId)
        .where(<keyof ContributionModel>'kind', '==', payload.kind)
        .where(<keyof ContributionModel>'pubId', '==', payload.pubId)
        .where(<keyof ContributionModel>'actionId', '==', payload.actionId);

    const results = await query.get();

    // contribution already exists
    if (results.size > 0) return;

    /// create new contribution
    const ref = FirestoreInstance.collection('contributions').doc(payload.id);
    batch.set(ref, payload);
}