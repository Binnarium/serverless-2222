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
    marathonAwards?: firestore.FieldValue | Array<MedalModel>;
    projectAwards?: firestore.FieldValue | Array<MedalModel>;
    contributionsAwards?: firestore.FieldValue | Array<MedalModel>;
    clubhouseAwards?: firestore.FieldValue | Array<MedalModel>;
    workshopAwards?: firestore.FieldValue | Array<MedalModel>;

    /// flags
    courseStatus?: string | null;
    allowWebAccess?: boolean | null;
    playerType?: string | null;
}

export interface MedalModel {
    cityId: string | null;
    obtained: true;
    count?: number;
}

export interface UpdatePlayerMedals extends Pick<PlayerModel, 'projectAwards' | 'contributionsAwards' | 'clubhouseAwards'> {
}
export interface UpdatePubUserIdPlayerModel extends Pick<PlayerModel, 'pubUserId'> {
}

export type UpdatePlayerCourseFlags = Pick<PlayerModel, 'courseStatus' | 'allowWebAccess' | 'playerType'>;
