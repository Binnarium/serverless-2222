import cheerio from "cheerio";
import { firestore } from "firebase-admin";
import * as functions from "firebase-functions";
import fetch from "node-fetch";
import { MedalModel, PlayerModel, UpdatePlayerMedals } from "../../players/models/player.model";
import { FirestoreInstance } from "../../utils/configuration";
import { ClubhouseModel } from "../models/clubhouse.model";
import { CreatedClubhouseModel } from "../models/created-clubhouse.model";


// when a new player is created add it to the players index
export const CLUBHOUSE_obtainClubhouseInformation = functions.firestore
    .document('players/{uid}/clubhouse/{id}')
    .onCreate(async (snapshot, context) => {
        try {
            const batch = FirestoreInstance.batch();
            const { clubhouseUrl, cityId, id, uploaderId } = <CreatedClubhouseModel>snapshot.data();

            /// validate clubhouse url does not already exists
            const searchIfClubhouseExistsQuery = FirestoreInstance.collectionGroup('clubhouse')
                .where(<keyof CreatedClubhouseModel>'clubhouseUrl', '==', clubhouseUrl);
            const searchResults = await searchIfClubhouseExistsQuery.get();

            /// Since the url has been pasted again, delete old one for new one
            if (searchResults.docs.length > 1) {
                console.log('already exists, deleting old one')
                for (const doc of searchResults.docs) {
                    // dont update the current one
                    if (id === doc.id)
                        continue;

                    // batch.delete(doc.ref);
                }
            }

            const page = await fetch(clubhouseUrl);
            const html = await page.text();
            const $ = cheerio.load(html);

            // obtain date from raw html
            const coincidence = /(const dt =).*/.exec(html)?.[0] ?? null;
            let rawDate = coincidence?.split('"')[1] ?? null;
            // if (!rawDate)
            //     rawDate = new Date().toISOString();

            // update url
            const updatedClubhouseUrl =
                $('meta[property = "og:url"]').attr('content')
                ?? $('meta[name = "twitter:url"]').attr('content')
                ?? null;

            if (!updatedClubhouseUrl)
                throw Error('Invalid clubhouse updated url');

            /// player doc 
            const playerDoc = FirestoreInstance.collection('players').doc(uploaderId);
            const playerSnap = await playerDoc.get();
            const player: PlayerModel | null = <PlayerModel>playerSnap.data();

            const clubhouse: ClubhouseModel = {
                cityId,
                id,
                uploaderDisplayName: player?.displayName?.trim(),
                clubhouseUrl: updatedClubhouseUrl,
                name: $('title').first().text().split('-')[0].trim(),
                clubhouseId: updatedClubhouseUrl.split('/')[updatedClubhouseUrl.split('/').length - 1] ?? null,
                uploaderId,
                date: rawDate ? new Date(rawDate) : new Date(),
                scraped: firestore.FieldValue.serverTimestamp(),
            };

            // update document data
            batch.update(snapshot.ref, clubhouse);
            console.log('updating', JSON.stringify(clubhouse));

            // update player doc
            batch.update(playerDoc, <UpdatePlayerMedals>{
                clubhouseAwards: firestore.FieldValue.arrayUnion(<MedalModel>{
                    cityId,
                    obtained: true,
                }),
            });

            await batch.commit();

        } catch (error) {
            /// in case of error, delete uplodaded information
            console.error(error);
            console.error({ ref: snapshot.ref, data: JSON.stringify(snapshot.data()) });
            await snapshot.ref.update({
                ok: false
            });
        }
    });

