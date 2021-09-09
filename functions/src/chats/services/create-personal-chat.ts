import { firestore } from "firebase-admin";
import * as functions from "firebase-functions";
import { PlayerModel } from "../../players/models/player.model";
import { FirestoreInstance } from "../../utils/configuration";
import { randomIdGenerator } from "../../utils/random-id-generator";
import { ChatModel } from "../model/chat.model";
import { CreatePersonalChat } from "../model/create-personal-chat.model";

// when a new player is created add it to the players index
export const createPersonalChat = functions.https.onCall(async (data: CreatePersonalChat, context): Promise<string | null> => {
    try {
        /// only valid queries
        if (!data.playerOne || !data.playerTwo)
            return null;

        // search a chat does not already exists
        const chatsSnapshot = await FirestoreInstance.collection('chats')
            .where(<keyof ChatModel>'kind', '==', <ChatModel['kind']>'CHAT#PERSONAL')
            .where(<keyof ChatModel>'participantsUids', 'array-contains', data.playerOne)
            .where(<keyof ChatModel>'participantsUids', 'array-contains', data.playerTwo)
            .get();

        /// chat already exists
        /// sen chat id
        if (chatsSnapshot.docs.length > 0)
            return chatsSnapshot.docs[0].id;

        /// create new chat, fist obtain participants information
        const [playerOne, playerTwo]: [PlayerModel | null, PlayerModel | null] = await Promise.all([
            FirestoreInstance.collection('players').doc(data.playerOne).get().then(snap => snap.exists ? snap.data() as PlayerModel : null),
            FirestoreInstance.collection('players').doc(data.playerTwo).get().then(snap => snap.exists ? snap.data() as PlayerModel : null),
        ]);

        /// only valid queries
        if (!playerOne || !playerTwo)
            return null;

        /// chat group not found, create new
        const chatId = randomIdGenerator(15);
        const newChat: ChatModel = {
            id: chatId,
            kind: 'CHAT#PERSONAL',
            disabled: false,
            participants: [
                { displayName: playerOne.displayName, uid: playerOne.uid, canSendMessage: true },
                { displayName: playerTwo.displayName, uid: playerTwo.uid, canSendMessage: true },
            ],
            participantsUids: [
                playerOne.uid,
                playerTwo.uid,
            ],
            lastActivity: firestore.FieldValue.serverTimestamp(),
            lastMessage: null,
            name: null,
            participantsCompleted: true,
        };

        await FirestoreInstance.collection('chats').doc(chatId).set(newChat);
        return chatId;
    } catch (error) {
        console.error(error);
        return null;
    }

});