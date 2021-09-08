import { firestore } from "firebase-admin";
import * as functions from "firebase-functions";
import { FirestoreInstance } from "../../utils/configuration";
import { MessageModel, UpdateMessageSendedDate } from "../model/message.model";
import { UpdateChatLastMessageModel } from "../model/update-chat-last-message.model";

export const updateChatLastMessage = functions.firestore
    .document('chats/{chatId}/messages/{messageId}')
    .onCreate(async (snapshot, context) => {
        const batch = FirestoreInstance.batch();
        const chatId: string = context.params.chatId;
        const message: MessageModel = <MessageModel>snapshot.data();

        const lastActivity = firestore.FieldValue.serverTimestamp();

        /// update last message, & while that updating the message model
        const updateChat: UpdateChatLastMessageModel = {
            lastActivity,
            lastMessage: {
                ...message, sendedDate: lastActivity
            },
        };

        /// update message just in case
        const updateMessage: UpdateMessageSendedDate = {
            sendedDate: lastActivity,
        };

        // update chat & message
        // once indexed update document with indexed time
        batch.update(FirestoreInstance.collection('chats').doc(chatId), updateChat);
        batch.update(snapshot.ref, updateMessage);

        await batch.commit();
    });