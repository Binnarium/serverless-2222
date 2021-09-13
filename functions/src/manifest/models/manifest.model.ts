import { firestore } from "firebase-admin";

export interface ManifestModel {
    id: string;
    pubUrl: string | null;
    playerId: string | null;
    title: string;
    cityId: string;
    scraped: firestore.FieldValue;
}