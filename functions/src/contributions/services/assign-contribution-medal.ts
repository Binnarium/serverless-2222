import cheerio from "cheerio";
import { firestore } from "firebase-admin";
import * as functions from "firebase-functions";
import * as https from "https";
import fetch from "node-fetch";
import { MedalModel, PlayerModel, UpdatePlayerMedals } from "../../players/models/player.model";
import { FirestoreInstance } from "../../utils/configuration";
import { ContributionModel } from "../models/contribution.model";

const agent = new https.Agent({
    rejectUnauthorized: false
});
// every minute get a contribution that has not been assigned yet and assign it to the owner
// 
// query only contribution that has not being assigned yet, and limit to 25 each run
export const assignPlayerMissingContributions = functions.pubsub.schedule('*/10 * * * *')
    .onRun(async (context) => { });

export const assignMedalOnCreate = functions.firestore
    .document('contributions/{contributionId}')
    .onCreate(async (snapshot, context) => {
        const batch = FirestoreInstance.batch();

        const contribution = <ContributionModel>snapshot.data();

        const pubUserId = contribution.pubUserId;

        /// search for an existing player with the pubUserId;
        /// if found assign the medal and update state of contribution
        const findPlayerWithPubPlayerIdQuery = FirestoreInstance
            .collection('players')
            .where(<keyof PlayerModel>'pubUserId', '!=', <PlayerModel['pubUserId']>pubUserId)
            .limit(1) as firestore.Query<PlayerModel>;

        const queryResults = await findPlayerWithPubPlayerIdQuery.get();

        /// found a player
        if (queryResults.docs.length > 0) {
            /// found coincidence
            const [foundPlayerSnap] = queryResults.docs;
            const foundPlayer = foundPlayerSnap.exists ? foundPlayerSnap.data() : null;

            if (!foundPlayer) {
                console.error(`no player data found ${foundPlayerSnap.ref.path}`);
                return;
            }
            addMedalToPlayer(batch, foundPlayer, foundPlayerSnap.ref, contribution);
        }


        /// since no player has been found with the pubUserId property
        /// search for a 2222 code in the user biography, if found update 
        /// player with pubUserId, assign medal and update state of contribution
        else {
            const page = await fetch(`https://lab-movil-2222.pubpub.org/user/${contribution.pubUserSlug}`, { agent });
            const html = await page.text();
            const $ = cheerio.load(html);
            const viewData = JSON.parse($('#view-data').attr('data-json') ?? '{}')

            // validate view data exists
            const bio: string = viewData?.userData?.bio ?? null;

            if (!bio) {
                console.error(`no page data found or bio of https://lab-movil-2222.pubpub.org/user/${contribution.pubUserSlug}`);
                return;
            }

            const find2222CodeRegExp = RegExp(/\bC2222-.[0-9a-zA-Z]*\b/);
            const code = find2222CodeRegExp.exec(bio)?.[0];
            const playerPubCode = code?.split('-')[1];

            /// no pub code found in player, return prematurely
            if (!playerPubCode)
                return;

            /// query for player with code
            const playersCollection = FirestoreInstance.collection('players')
                .where(<keyof PlayerModel>'pubCode', '==', playerPubCode);

            const playersSnap = await playersCollection.get();

            /// found player with code, save them code
            if (playersSnap.docs.length > 0) {
                const [foundPlayerSnap] = queryResults.docs;
                const foundPlayer = foundPlayerSnap.exists ? foundPlayerSnap.data() : null;

                if (!foundPlayer) {
                    console.error(`no player data found ${foundPlayerSnap.ref.path}`);
                    return;
                }

                addMedalToPlayer(batch, foundPlayer, foundPlayerSnap.ref, contribution);

                /// update player with pubcode
                batch.update(foundPlayerSnap.ref, <PlayerModel>{
                    pubUserId: contribution.pubUserId,
                });

            }
            /// no players found, return prematurely, dont save nothing
            else {
                return;
            }
        }

        /// no player or code found. dont update state of the contribution so it can 
        /// be assigned later by the cron backup process

        /// commit all changes made
        await batch.commit();
    });

function addMedalToPlayer(batch: firestore.WriteBatch, foundPlayer: PlayerModel, playerRef: firestore.DocumentReference, contribution: ContributionModel) {
    /// player contains an element with the content of a contribution
    const contributionsAwards = foundPlayer?.contributionsAwards as Array<MedalModel> | null | undefined;
    const oldMedal = contributionsAwards?.find(c => c.cityId === contribution.cityId) ?? null;

    /// already contains medals, add new medal to array
    if (contributionsAwards && oldMedal) {
        /// update already existing medal
        /// create a copy of the award, except the one to be updated     
        const newContributionAwards = contributionsAwards.filter(c => c.cityId !== contribution.cityId);

        batch.update(playerRef, <UpdatePlayerMedals>{
            contributionsAwards: [
                ...newContributionAwards,
                /// new medal
                <MedalModel>{
                    cityId: contribution.cityId,
                    obtained: true,
                    count: (oldMedal.count ?? 0) + 1,
                }
            ]
        });
    }

    /// player has no medals yet, create array 
    else {
        /// player has no contribution awards yet or no medal yet
        const updatePlayerContributionMedal: UpdatePlayerMedals = {
            contributionsAwards: firestore.FieldValue.arrayUnion(<MedalModel>{
                cityId: contribution.cityId,
                obtained: true,
                count: 1,
            }),
        };
        batch.update(playerRef, updatePlayerContributionMedal);
    }
}