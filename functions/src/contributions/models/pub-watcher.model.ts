import { firestore } from "firebase-admin";

export interface PubWatcher {
    id: string;
    cityId: string;
    pubSlug: string;
    pubId: string;
    pubUrl: string;
    title: string;
    scrapedAt: firestore.FieldValue;
    lastActivity: string | null;
}

export interface UpdatePubWatcherDate extends Pick<PubWatcher, 'scrapedAt' | 'lastActivity'> {
}