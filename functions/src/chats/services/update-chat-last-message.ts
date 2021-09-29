import { firestore } from "firebase-admin";
import * as functions from "firebase-functions";
import { FirestoreInstance } from "../../utils/configuration";
import { MessageModel, UpdateMessageSendedDate } from "../model/message.model";
import { UpdateChatLastMessageModel } from "../model/update-chat-last-message.model";

/**
 * update the chat information with the last sended message data
 */
export const CHAT_updateChatLastSendedMessage = functions.firestore
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

/**
 * When a message gets updated, check if the message updated is the same as the one in the chat
 * therefore chat will be update with the new metadata
 */
export const CHAT_updateChatLastSendedM
essageData = functions.firestore
    .document('chats/{chatId}/messages/{messageId}')
    .onUpdate(async (snapshot, context) => {
        const batch = FirestoreInstance.batch();
        const chatId: string = context.params.chatId;
        const oldMessage: MessageModel = <MessageModel>snapshot.before.data();
        const newMessage: MessageModel = <MessageModel>snapshot.after.data();

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