import cheerio from "cheerio";
import { firestore } from "firebase-admin";
import * as functions from "firebase-functions";
import * as https from "https";
import fetch from "node-fetch";
import { PlayerModel } from "../../players/models/player.model";
import { UpdateAward, UpdatePlayerMedals } from "../../players/models/update-player-medals.modal";
import { FirestoreInstance } from "../../utils/configuration";
import { CreatedManifestModel } from "../models/created-manifest.model";
import { ManifestModel } from "../models/manifest.model";

const agent = new https.Agent({
    rejectUnauthorized: false
});
// when a new player is created add it to the players index
export const obtainManifestInformation = functions.firestore
    .document('manifest/{id}')
    .onCreate(async (snapshot, context) => {
        const manifest = <CreatedManifestModel>snapshot.data();
        await scrapManifest(manifest);
    });


// // export const scrapMissingPubs = functions.pubsub.schedule('* * * * *')
// //     .onRun(async (context) => {
// //         const unScrappedManifests = await FirestoreInstance.collection('manifest')
// //             .where(<keyof ManifestModel>'playerId', '==', <ManifestModel['playerId']>null)
// //             .limit(2)
// //             .get();
// //         for await (const snapshot of unScrappedManifests.docs) {
// //             const manifest = <ManifestModel>snapshot.data()
// //             await scrapManifest(manifest);
// //         }
// //     });


async function scrapManifest(manifest: CreatedManifestModel) {
    const batch = FirestoreInstance.batch();
    const { pubUrl: originalPubUrl, id: manifestId, cityId } = manifest;

    const page = await fetch(originalPubUrl!, { agent });
    const html = await page.text();
    const $ = cheerio.load(html);


    /// player doc 
    const playerId: string | null = await getPlayerUidFromHtml(html);

    const updateManifest: ManifestModel = {
        title: $('meta[name = "dc.title"]').attr('content') ?? $('title').first().text(),
        id: manifestId,
        scraped: firestore.FieldValue.serverTimestamp(),
        playerId: playerId,
        pubUrl: getPubUrl(originalPubUrl!),
        cityId
    };

    batch.update(FirestoreInstance.collection('manifest').doc(manifestId), updateManifest);

    // update player information with medal
    if (playerId) {
        const playerDoc = FirestoreInstance.collection('players').doc(playerId);

        batch.update(playerDoc, <UpdatePlayerMedals>{
            contributionsAwards: firestore.FieldValue.arrayUnion(<UpdateAward>{
                cityId,
                obtained: true,
            }),
        });
    }

    await batch.commit();
}


async function getPlayerUidFromHtml(pubHtml: string): Promise<string | null> {
    const findUserRegex = RegExp(/((href="\/user\/).*("))/);
    const userHref = findUserRegex.exec(pubHtml)?.[0];
    const pubUsername = userHref?.split('"')?.[1];
    const pubUserUrl = `https://lab-movil-2222.pubpub.org${pubUsername}`;

    /// load player url
    const page = await fetch(pubUserUrl, { agent });
    const html = await page.text();
    const find2222Code = RegExp(/((code2222_).*(_))/);
    const code = find2222Code.exec(html)?.[0];
    const playerPubCode = code?.split('_')[1];

    /// query for player with code s
    const playersCollection = FirestoreInstance.collection('players')
        .where(<keyof PlayerModel>'pubCode', '==', playerPubCode);
    const playersSnap = await playersCollection.get();
    const player: PlayerModel | null = <PlayerModel>playersSnap.docs[0]?.data();
    return player?.uid;
}

function getPubUrl(originalUrl: string): string | null {
    const splittedContent = originalUrl.split('/');
    const pubIndex = splittedContent.findIndex(e => e === 'pub');
    if (pubIndex < 0)
        return null;
    return splittedContent.splice(0, pubIndex + 2).join('/');
}