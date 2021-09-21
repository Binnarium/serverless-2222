import cheerio from "cheerio";
import { firestore } from "firebase-admin";
import * as functions from "firebase-functions";
import * as https from "https";
import fetch from "node-fetch";
import { FirestoreInstance } from "../../utils/configuration";
import { CollectionWatcher, UpdateCollectionWatcherDate } from "../models/collection-watcher.model";
import { PubWatcher } from "../models/pub-watcher.model";

const agent = new https.Agent({
    rejectUnauthorized: false
});

/// add pubs so that pubs can be query later
export const updatePubWatchers = functions.pubsub.schedule('0 */3 * * *')
    .onRun(async (context) => {
        const batch = FirestoreInstance.batch();

        /// get all collections
        const query = FirestoreInstance
            .collection('contributions')
            .doc('_configuration_')
            .collection('collection-watchers')
            .orderBy(<keyof CollectionWatcher>'scrapedAt', 'desc')
            .limit(1) as firestore.Query<CollectionWatcher>;

        const { docs } = await query.get();

        const tasks = docs.map(async watcherRef => {
            /// update scraped date
            batch.update(watcherRef.ref, <UpdateCollectionWatcherDate>{ scrapedAt: firestore.FieldValue.serverTimestamp() });

            const watcherData: CollectionWatcher | null = watcherRef.data() ?? null;
            if (!watcherData) {
                console.error(`empty watcher doc ${watcherRef.ref.path}`);
                return;
            }

            /// scrap the url for all pubs
            const page = await fetch(watcherData.pubCollectionUrl, { agent });
            const html = await page.text();
            const $ = cheerio.load(html);
            const viewData = JSON.parse($('#view-data').attr('data-json') ?? '{}')

            // validate view data exists
            const pageData = viewData?.pageData ?? null;

            if (!pageData) {
                console.error(`no page data found ${watcherData.pubCollectionUrl}`);
                return;
            }

            if (!pageData?.layoutPubsByBlock?.pubsById) {
                console.error(`no pubs data found ${watcherData.pubCollectionUrl}`);
                return;
            }

            const pubs = Object.values(pageData?.layoutPubsByBlock?.pubsById);

            /// store pubs watchers 
            const pubTasks = pubs.map(async (pub: any) => {
                if (!pub.id) {
                    console.error(`no pub id found ${pub}`);
                    return;
                }
                const ref = FirestoreInstance.collection('contributions').doc('_configuration_')
                    .collection('pubs-watchers').doc(pub.id);

                /// add only if not indexed
                const oldSnap = await ref.get();
                if (oldSnap.exists)
                    return;

                const data: PubWatcher = {
                    cityId: watcherData.cityId,
                    scrapedAt: firestore.FieldValue.serverTimestamp(),
                    id: pub.id,
                    pubUrl: `https://lab-movil-2222.pubpub.org/pub/${pub.slug}`,
                    pubSlug: pub.slug,
                    title: pub.title
                };

                batch.set(ref, data);
            });
            await Promise.all(pubTasks);
        });
        await Promise.all(tasks);
        await batch.commit();
    });