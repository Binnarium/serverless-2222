import { firestore } from "firebase-admin";

export interface ClubhouseModel {
    clubhouseUrl: string;
    clubhouseId: string;
    date: Date;
    name: string;
    cityId: string;
    uploaderId: string;
    scraped: firestore.FieldValue;
    id: string;
}