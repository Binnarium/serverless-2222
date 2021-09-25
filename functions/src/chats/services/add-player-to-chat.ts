import { firestore } from "firebase-admin";
import * as functions from "firebase-functions";
import { PlayerModel } from "../../players/models/player.model";
import { UpdatePlayerGroupModel } from "../../players/models/update-player-group.model";
import { FirestoreInstance } from "../../utils/configuration";
import { randomIdGenerator } from "../../utils/random-id-generator";
import { ChatParticipantModel } from "../model/chat-participant.model";
import { ChatModel } from "../model/chat.model";

const LIMIT_OF_CHAT_PARTICIPANTS_SIZE = 10;

// when a new player is created add it to the players index
export const addPlayerToChats = functions
    .runWith({ maxInstances: 1 })
    .firestore
    .document('players/{uid}')
    .onCreate(async (snapshot, context) => {
        const player = <PlayerModel>snapshot.data();

        await AddPlayerToGeneralAndSpecificChat(player);
    });

// Add player that haven't been added to chat cron
// // export const addMissingPlayerToChats = functions.pubsub.schedule('* * * * *')
// //     .onRun(async (context) => {
// //         const unAddedPlayers = await FirestoreInstance.collection('players')
// //             .where(<keyof PlayerModel>'addedToChat', '==', <PlayerModel['addedToChat']>false)
// //             .limit(2)
// //             .get();

// //         for await (const snapshot of unAddedPlayers.docs) {
// //             const player = <PlayerModel>snapshot.data()
// //             await AddPlayerToGeneralAndSpecificChat(player);
// //         }
// //     });


/// add player to doc with batch
async function AddPlayerToGeneralAndSpecificChat(player: PlayerModel): Promise<void> {
    const batch = FirestoreInstance.batch();
    const playerRef = FirestoreInstance.collection('players').doc(player.uid);

    const generalChatParticipant: Partial<ChatModel> = {
        participants: firestore.FieldValue.arrayUnion(<ChatParticipantModel>{
            displayName: player.displayName,
            uid: player.uid,
            canSendMessage: false,
        }),
        participantsUids: firestore.FieldValue.arrayUnion(<string>player.uid),
    };


    // add to general chat
    const generalChatDoc = FirestoreInstance.collection('chats').doc('general');
    batch.update(generalChatDoc, generalChatParticipant);

    // add player to group chat
    const chatsSnapshot = await FirestoreInstance.collection('chats')
        .where(<keyof ChatModel>'participantsCompleted', '==', false)
        .where(<keyof ChatModel>'id', '!=', 'general')
        .limit(1)
        .get();
    let groupId: null | string = null;

    /// add player to existing chat, or create new player
    if (chatsSnapshot.docs.length > 0) {
        const foundGroupChat: ChatModel = chatsSnapshot.docs[0].data() as ChatModel;
        groupId = foundGroupChat.id
        const chatDoc = FirestoreInstance.collection('chats').doc(foundGroupChat.id);
        /// chat group found, therefore add  player to chat
        const updateChat: Partial<ChatModel> = {
            participants: firestore.FieldValue.arrayUnion(<ChatParticipantModel>{
                displayName: player.displayName,
                uid: player.uid,
                canSendMessage: true,
            }),
            participantsUids: firestore.FieldValue.arrayUnion(<string>player.uid),
            participantsCompleted: (foundGroupChat.participantsUids as Array<string>).length + 1 >= LIMIT_OF_CHAT_PARTICIPANTS_SIZE,
        };
        batch.update(chatDoc, updateChat);
    } else {
        /// chat group not found, create new
        const chatId = randomIdGenerator(15);
        groupId = chatId;
        const newChat: ChatModel = {
            id: chatId,
            kind: 'CHAT#GROUP',
            disabled: false,
            participants: [{ displayName: player.displayName, uid: player.uid, canSendMessage: true }],
            participantsUids: [player.uid],
            lastActivity: firestore.FieldValue.serverTimestamp(),
            lastMessage: null,
            name: null,
            participantsCompleted: false,
        };
        const newChatDoc = FirestoreInstance.collection('chats').doc(chatId);
        batch.set(newChatDoc, newChat);
    }

    // update player was added to chats
    const playerUpdate: UpdatePlayerGroupModel = { addedToChat: true, groupId };

    batch.update(playerRef, playerUpdate);

    await batch.commit();

}