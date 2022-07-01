import { firestore } from "firebase-admin";
import * as functions from "firebase-functions";
import { FirestoreInstance } from "../../utils/configuration";
import { ChatModel } from "../model/chat.model";

export const CHAT_createGroupChat = functions.https.onCall(async (data?: { name?: string }) => {

    if (!data?.name) throw new Error('Invalid Parameters');

    const id = data.name.replace(/[^\w\s]/gi, '');

    const batch = FirestoreInstance.batch();

    const newChatRef = FirestoreInstance.collection('chats').doc(id);
    const chatPayload: ChatModel = {
        id,
        kind: 'CHAT#GROUP',
        disabled: false,
        participants: [],
        participantsUids: [],
        lastActivity: firestore.FieldValue.serverTimestamp(),
        lastMessage: null,
        name: null,
        participantsCompleted: false,
    };

    batch.set(newChatRef, chatPayload);

    await batch.commit();

    return { id };
});