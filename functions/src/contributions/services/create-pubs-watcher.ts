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

/**
 * query the collections and scan pubs created on each tag
 * 
 * every collection is queried after 15 hours each
 * 10 cities * 3 collections / city 
 */
// export const updatePubWatchers = functions.pubsub.schedule('*/30 * * * *')
export const CONTRIBUTIONS_updatePubWatchers = functions.pubsub.schedule('* * * * *')
    .onRun(async (context) => {
        const batch = FirestoreInstance.batch();

        /// get the oldest queried document of the collections
        const query = FirestoreInstance
            .collection('contributions')
            .doc('_configuration_')
            .collection('collection-watchers')
            .orderBy(<keyof CollectionWatcher>'scrapedAt', 'desc')
            .limit(1) as firestore.Query<CollectionWatcher>;

        const { docs } = await query.get();

        console.log(`Watchers found ${docs.length}`);

        const tasks = docs.map(async watcherRef => {
            /// update scraped date
            batch.update(watcherRef.ref, <UpdateCollectionWatcherDate>{ scrapedAt: firestore.FieldValue.serverTimestamp() });

            const watcherData: CollectionWatcher | null = watcherRef.data() ?? null;

            if (!watcherData) {
                console.error(`empty watcher data ${watcherRef.ref.path}`);
                return;
            }

            /// scrap the url for all pubs
            const page = await fetch(watcherData.pubCollectionUrl, { agent });
            const html = await page.text();
            const $ = cheerio.load(html);
            const viewData = JSON.parse($('#view-data').attr('data-json') ?? '{}')

            // validate view data exists
            const layoutPubsByBlock = viewData?.layoutPubsByBlock ?? null;

            if (!layoutPubsByBlock) {
                console.error(`no page data found ${watcherData.pubCollectionUrl}`);
                return;
            }

            if (!layoutPubsByBlock?.pubsById) {
                console.error(`no pubs data found ${watcherData.pubCollectionUrl}`);
                return;
            }

            /// transform map to array and get only pubs
            const pubs = Object.values(layoutPubsByBlock?.pubsById);
            console.log(`Nuner of pubs found in ${watcherData.id} are ${pubs.length}`);

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
                    title: pub.title,
                    pubId: pub.id,
                    lastActivity: null, /// since first time default is null
                };

                batch.set(ref, data);
            });
            await Promise.all(pubTasks);
        });
        await Promise.all(tasks);
        await batch.commit();
    });