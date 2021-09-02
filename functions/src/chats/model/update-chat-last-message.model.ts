import { firestore } from "firebase-admin";
import { ChatModel } from "./chat.model";

export interface UpdateChatLastMessageModel extends Pick<ChatModel, 'lastActivity' | 'lastMessage'> {
    lastActivity: firestore.FieldValue;
}