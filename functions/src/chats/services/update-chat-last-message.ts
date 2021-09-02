import { firestore } from "firebase-admin";
import * as functions from "firebase-functions";
import { FirestoreInstance } from "../../utils/configuration";
import { MessageModel } from "../model/message.model";
import { UpdateChatLastMessageModel } from "../model/update-chat-last-message.model";

export const updateChatLastMessage = functions.firestore
    .document('chats/{chatId}/messages/{messageId}')
    .onCreate(async (snapshot, context) => {
        const chatId: string = context.params.chatId;
        const message: MessageModel = <MessageModel>snapshot.data();

        const updateChat: UpdateChatLastMessageModel = {
            lastActivity: firestore.FieldValue.serverTimestamp(),
            lastMessage: message,
        };

        // once indexed update document with indexed time
        await FirestoreInstance.collection('chats').doc(chatId).update(updateChat);
    });