import cheerio from "cheerio";
import { firestore } from "firebase-admin";
import * as functions from "firebase-functions";
import fetch from "node-fetch";
import { FirestoreInstance } from "../../utils/configuration";
import { ClubhouseModel } from "../models/clubhouse.model";
import { CreatedClubhouseModel } from "../models/created-clubhouse.model";


// when a new player is created add it to the players index
export const obtainClubhouseInformation = functions.firestore
    .document('clubhouse/{id}')
    .onCreate(async (snapshot, context) => {
        const { clubhouseUrl, cityId, id, uploaderId } = <CreatedClubhouseModel>snapshot.data();

        const page = await fetch(clubhouseUrl);
        const html = await page.text();
        const $ = cheerio.load(html);

        // obtain date from raw html
        const coincidence = /(const dt =).*/.exec(html)?.[0] ?? null;
        const rawDate = coincidence?.split('"')[1] ?? null;

        if (!rawDate)
            throw Error('Invalid date');


        const updatedClubhouseUrl = $('meta[property = "twitter:url"]').attr('content');
        if (!updatedClubhouseUrl)
            throw Error('Invalid clubhouse updated url');

        const clubhouse: ClubhouseModel = {
            cityId,
            id,
            clubhouseUrl: updatedClubhouseUrl,
            name: $('title').first().text(),
            clubhouseId: updatedClubhouseUrl.split('event/')[1],
            uploaderId,
            date: new Date(rawDate),
            scraped: firestore.FieldValue.serverTimestamp(),
        };

        // update document data
        await FirestoreInstance.collection('clubhouse')
            .doc(clubhouse.id)
            .update(clubhouse);
    });

