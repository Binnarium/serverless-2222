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

        const nameCoincidence = /(<em>w\/).*/.exec(html)?.[0] ?? null;
        const rawName = nameCoincidence?.split(RegExp('((<em>w/)|(</em>))'))[1] ?? null;

        // update url
        const updatedClubhouseUrl = $('meta[property = "twitter:url"]').attr('content');
        if (!updatedClubhouseUrl)
            throw Error('Invalid clubhouse updated url');

        const clubhouse: ClubhouseModel = {
            cityId,
            id,
            uploaderDisplayName: rawName?.trim(),
            clubhouseUrl: updatedClubhouseUrl,
            name: $('title').first().text().split('-')[0].trim(),
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

