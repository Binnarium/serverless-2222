import { firestore } from "firebase-admin";

export interface PlayerModel {
    displayName: string;
    email: string;
    uid: string;
    pubCode: string;
    pubUserId?: string | null;
    addedToChat?: boolean | null;
    groupId?: string | null;

    /// medals
    proactivity: number;
    projectAwards?: firestore.FieldValue | Array<MedalModel>;
    contributionsAwards?: firestore.FieldValue | Array<MedalModel>;
    clubhouseAwards?: firestore.FieldValue | Array<MedalModel>;
}

export interface MedalModel {
    cityId: string;
    obtained: true;
    count?: number;
}

export interface UpdatePlayerMedals extends Pick<PlayerModel, 'projectAwards' | 'contributionsAwards' | 'clubhouseAwards'> {
}