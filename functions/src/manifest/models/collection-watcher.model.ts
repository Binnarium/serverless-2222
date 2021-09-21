import { firestore } from "firebase-admin";

export interface CollectionWatcher {
    id: string;
    pubCollectionUrl: string;
    cityId: string;
    scrapedAt: firestore.FieldValue;
}

export interface UpdateCollectionWatcherDate extends Pick<CollectionWatcher, 'scrapedAt'> {
}