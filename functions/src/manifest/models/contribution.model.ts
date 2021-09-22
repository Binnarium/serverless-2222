import { firestore } from "firebase-admin";

export interface ContributionModel {
    id: string;
    pubSlug: string;
    pubUrl: string;
    pubId: string;
    cityId: string;
    pubUserId: string;
    pubUserSlug: string;
    isPointAwarded: boolean;
    pubTitle: string;
    kind: 'CONTRIBUTION#ATTRIBUTION' | 'CONTRIBUTION#DISCUSSION' | 'CONTRIBUTION#EDITED';
    actionId: string;
    createdDate: firestore.FieldValue;
}