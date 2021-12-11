import cheerio from "cheerio";
import { firestore } from "firebase-admin";
import * as functions from "firebase-functions";
import * as https from "https";
import fetch from "node-fetch";
import { UpdatePubUserIdPlayerModel } from "../../players/models/player.model";
import { FirestoreInstance } from "../../utils/configuration";
import { CollectionWatcher } from "../models/collection-watcher.model";
import { PubWatcher } from "../models/pub-watcher.model";

const agent = new https.Agent({
    rejectUnauthorized: false
});

/**
 * query the collections and scan pubs created on each tag
 * 
 * every collection is queried after 15 hours each
 * 10 cities * 3 collections / city = 30 collections
 * the query runs every 30 mins, thats, 48 times in a day
 */
export const CONTRIBUTIONS_updatePubWatchersFromProfile = functions.https.onCall(async (data, context) => {
    const batch = FirestoreInstance.batch();
    const profileUrl = data.profileUrl;
    const playerUid = data.playerUid;

    if (!profileUrl || !playerUid)
        throw new Error("Missing params");

    /// query profile page and get published pubs
    const page = await fetch(profileUrl, { agent });
    const html = await page.text();
    const $ = cheerio.load(html);
    const viewData = JSON.parse($('#view-data').attr('data-json') ?? '{}')

    // validate view data exists
    const userData = viewData?.userData ?? null;

    if (!userData) {
        console.error(`no page data found ${profileUrl}`);
        return;
    }


    /// assign pub user id to player
    try {

        const playerRef = FirestoreInstance.collection('players').doc(playerUid);
        const updateData: UpdatePubUserIdPlayerModel = {
            pubUserId: userData.id ?? null,
        };

        await playerRef.update(updateData);
    } catch (error) {

    }


    if (!userData?.attributions) {
        console.error(`no pubs data found ${profileUrl}`);
        return;
    }

    /// transform map to array and get only pubs
    const attributions: Array<any> = userData?.attributions;
    const pubsFound = attributions.length
    let pubsWatchersCreated = 0;
    let pubsWatchersExisting = 0;

    /// store pubs watchers 
    const attributionsTasks = attributions.map(async (attribution: any) => {

        const pub = attribution.pub;

        if (!pub || !pub.id) {
            console.error(`no pub found for attribution ${attribution.id}`);
            console.error(`no pub id found ${pub}`);
            return;
        }

        const ref = FirestoreInstance.collection('contributions').doc('_configuration_')
            .collection('pubs-watchers').doc(pub.id);

        /// add only if not indexed
        const oldSnap = await ref.get();

        if (oldSnap.exists) {
            pubsWatchersExisting++;
            return;
        }

        /// get collection to obtain the property of cityId
        const mainCollection = pub.collectionPubs?.[0]?.collectionId ?? null;
        if (!mainCollection) {
            console.error(`no collection found  for ${pub}`);
            return;
        }

        const queryCollection = FirestoreInstance.collection('contributions').doc('_configuration_')
            .collection('collection-watchers')
            .where(<keyof CollectionWatcher>'pubCollectionUrl', '==', `https://lab-movil-2222.pubpub.org/${mainCollection}`);

        const collectionsResponse = await queryCollection.get();

        const cityId = collectionsResponse.docs?.[0]?.data()?.cityId ?? null;
        if (!cityId) {
            console.error(`no cityId found  for ${pub}`);
            return;
        }
        const data: PubWatcher = {
            cityId,
            scrapedAt: firestore.FieldValue.serverTimestamp(),
            id: pub.id,
            pubUrl: `https://lab-movil-2222.pubpub.org/pub/${pub.slug}`,
            pubSlug: pub.slug,
            title: pub.title,
            pubId: pub.id,
            lastActivity: null, /// since first time default is null
        };
        pubsWatchersCreated++;
        batch.set(ref, data);
    });
    await Promise.all(attributionsTasks);
    await batch.commit();

    return { pubsFound, pubsWatchersCreated, pubsWatchersExisting }
});