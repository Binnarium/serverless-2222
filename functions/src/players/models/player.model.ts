export interface PlayerModel {
    displayName: string;
    email: string;
    uid: string;
    pubCode: string;
    indexedDate?: string | null;
    addedToChat?: boolean | null;
    groupId?: string | null;
}