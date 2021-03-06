import { firestore } from "firebase-admin";
import { ChatParticipantModel } from "./chat-participant.model";
import { MessageModel } from "./message.model";


export interface ChatModel {
    kind: 'CHAT#GROUP' | 'CHAT#GENERAL' | 'CHAT#PERSONAL';
    disabled: boolean;
    id: string;
    name?: string | null;
    lastActivity?: firestore.Timestamp | firestore.FieldValue | null;
    lastMessage?: MessageModel | null;
    courseVersion?: string | null;
    participants: firestore.FieldValue | Array<ChatParticipantModel>;
    participantsUids: firestore.FieldValue | Array<string>;
    participantsCompleted?: boolean;
    indexedDate?: firestore.Timestamp | firestore.FieldValue | null;
}