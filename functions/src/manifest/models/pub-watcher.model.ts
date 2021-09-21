import { firestore } from "firebase-admin";

export interface PubWatcher {
    id: string;
    cityId: string;
    pubSlug: string;
    pubUrl: string;
    title: string;
    scrapedAt: firestore.FieldValue;
}

export interface UpdatePubWatcherDate extends Pick<PubWatcher, 'scrapedAt'> {
}