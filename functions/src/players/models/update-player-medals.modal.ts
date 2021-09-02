import { firestore } from "firebase-admin";

export interface UpdatePlayerMedals {
    projectAwards?: firestore.FieldValue;
    contributionsAwards?: firestore.FieldValue;
    clubhouseAwards?: firestore.FieldValue;
}

export interface UpdateAward {
    cityId: string;
    obtained: true;
}