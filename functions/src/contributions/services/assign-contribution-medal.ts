import cheerio from "cheerio";
import { firestore } from "firebase-admin";
import * as functions from "firebase-functions";
import * as https from "https";
import fetch from "node-fetch";
import { PlayerModel, UpdatePubUserIdPlayerModel } from "../../players/models/player.model";
import { FirestoreInstance } from "../../utils/configuration";
import { ContributionModel } from "../models/contribution.model";

const agent = new https.Agent({
    rejectUnauthorized: false
});
// every 20 minutes get a contribution that has not been assigned yet and assign it to the owner
// 
// query only contribution that has not being assigned yet, and limit to 10 each run
export const CONTRIBUTIONS_assignPlayerMissingContributions = functions.runWith({ timeoutSeconds: 540 }).pubsub.schedule('*/30 * * * *')
    .onRun(async (context) => {
        const batch = FirestoreInstance.batch();

        /// find un-awarded contributions 
        const unAwardedContributionsQuery = FirestoreInstance
            .collection('contributions')
            .where(<keyof ContributionModel>'awardedToUid', '==', <ContributionModel['awardedToUid']>null)
            .limit(200) as firestore.Query<ContributionModel>;

        const unAwardedContributions = await unAwardedContributionsQuery.get();

        if (unAwardedContributions.docs.length === 0)
            return;

        for await (const snapshot of unAwardedContributions.docs) {
            if (!snapshot.exists)
                continue;

            const contribution = <ContributionModel>snapshot.data();
            await awardContribution(batch, contribution, snapshot.ref);
        }

        /// commit all changes made
        await batch.commit();

    });

export const CONTRIBUTIONS_assignContributionOnCreate = functions.firestore
    .document('contributions/{contributionId}')
    .onCreate(async (snapshot, context) => {
        const batch = FirestoreInstance.batch();

        const contribution = <ContributionModel>snapshot.data();

        await awardContribution(batch, contribution, snapshot.ref as any);

        /// commit all changes made
        await batch.commit();
    });


async function awardContribution(
    batch: firestore.WriteBatch,
    contribution: ContributionModel,
    contributionRef: firestore.DocumentReference<ContributionModel>,
) {

    /// search for an existing player with the pubUserId;
    /// if found assign the medal and update state of contribution
    const findPlayerWithPubPlayerIdQuery = FirestoreInstance
        .collection('players')
        .where(<keyof PlayerModel>'pubUserId', '==', <PlayerModel['pubUserId']>contribution.pubUserId)
        .limit(1) as firestore.Query<PlayerModel>;

    const searchResults = await findPlayerWithPubPlayerIdQuery.get();

    /// found a player
    /// assign that player the awardedToUid prop
    /// and finish the function
    if (searchResults.docs.length > 0) {
        /// found coincidence
        const foundPlayerSnap = searchResults.docs[0];
        const foundPlayer = foundPlayerSnap.exists ? foundPlayerSnap.data() : null;

        if (!foundPlayer) {
            console.error(`no player data found ${foundPlayerSnap.ref.path}`);
            return;
        }

        /// update contribution with awarded status
        batch.update(contributionRef, <ContributionModel>{ awardedToUid: foundPlayer.uid, });
    }


    /// since no player has been found with the pubUserId property
    /// search for a 2222 code in the user biography, if found update 
    /// player with pubUserId, assign medal and update state of contribution
    else {
        const page = await fetch(`https://pubpub.org/user/${contribution.pubUserSlug}`, { agent });
        const html = await page.text();
        const $ = cheerio.load(html);
        const viewData = JSON.parse($('#view-data').attr('data-json') ?? '{}')

        // validate view data exists
        const bio: string = viewData?.userData?.bio ?? null;

        if (!bio) {
            console.error(`no bio found for https://lab-movil-2222.pubpub.org/user/${contribution.pubUserSlug}`);
            return;
        }

        //// found bio, then search for code
        const find2222CodeRegExp = RegExp(/\bC2222-.[0-9a-zA-Z]*\b/);
        const code = find2222CodeRegExp.exec(bio)?.[0];
        const playerPubCode = code?.split('-')[1];

        /// validate player has added the code to the bio
        /// no pub code found in player, return prematurely
        if (!playerPubCode)
            return;

        /// query for player with code
        const playersCollection = FirestoreInstance.collection('players')
            .where(<keyof PlayerModel>'pubCode', '==', playerPubCode);

        const playersSnap = await playersCollection.get();

        /// found player with code, save them code
        if (playersSnap.docs.length > 0) {
            const foundPlayerSnap = playersSnap.docs[0];
            const foundPlayer = foundPlayerSnap.exists ? foundPlayerSnap.data() : null;

            if (!foundPlayer) {
                console.error(`no player data found ${foundPlayerSnap.ref.path}`);
                return;
            }

            /// update player with pubcode
            batch.update(foundPlayerSnap.ref, <UpdatePubUserIdPlayerModel>{ pubUserId: contribution.pubUserId, });

            /// update contribution with awarded status
            batch.update(contributionRef, <ContributionModel>{ awardedToUid: foundPlayer.uid, });
        }
        /// no players found with code, return prematurely, dont save nothing
        else {
            console.error(`no player with code ${playerPubCode} for https://lab-movil-2222.pubpub.org/user/${contribution.pubUserSlug}`);
            return;
        }
    }
}