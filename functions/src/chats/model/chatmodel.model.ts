import { firestore } from "firebase-admin";
export interface MessageModel { }
export interface ChatParticipantModel { uid: string; displayName: string; canSendMessage: boolean };

export interface ChatModel {
    disabled: boolean;
    id: string;
    name?: string | null;
    lastActivity?: firestore.Timestamp | firestore.FieldValue | null;
    lastMessage?: MessageModel | null;
    participants: firestore.FieldValue | Array<ChatParticipantModel>;
    participantsUids: firestore.FieldValue | Array<string>;
    participantsCompleted?: boolean;
}