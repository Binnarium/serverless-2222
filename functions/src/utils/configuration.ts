import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { MeiliSearch } from 'meilisearch';

const app = admin.initializeApp();

export const FirestoreInstance = app.firestore();
export const DatabaseInstance = app.database();
export const StorageInstance = app.storage();

export const projectId = app.options.projectId ?? '';

export const MeiliClient = new MeiliSearch({
    host: functions.config().meilisearch.host,
    apiKey: functions.config().meilisearch.api_key,
});