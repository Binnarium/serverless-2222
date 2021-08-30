import { firestore } from "firebase-admin";
import * as functions from "firebase-functions";
import { PlayerModel } from "../../players/models/player.model";
import { FirestoreInstance } from "../../utils/configuration";
import { randomIdGenerator } from "../../utils/random-id-generator";
import { ChatParticipantModel } from "../model/chat-participant.model";
import { ChatModel } from "../model/chat.model";

// when a new player is created add it to the players index
export const addPlayerToChats = functions
    .runWith({ maxInstances: 1 })
    .firestore
    .document('players/{uid}')
    .onCreate(async (snapshot, context) => {
        const batch = FirestoreInstance.batch();
        const player = <PlayerModel>snapshot.data();

        const generalChatParticipant: Partial<ChatModel> = {
            participants: firestore.FieldValue.arrayUnion(<ChatParticipantModel>{
                displayName: player.displayName,
                uid: player.uid,
                canSendMessage: false,
            }),
            participantsUids: firestore.FieldValue.arrayUnion(<string>player.uid),
        };

        // update player was added to chats
        batch.update(snapshot.ref, <Pick<PlayerModel, 'addedToChat'>>{ addedToChat: true });

        // add to general chat
        const generalChatDoc = FirestoreInstance.collection('chats').doc('general');
        batch.update(generalChatDoc, generalChatParticipant);

        // add player to group chat
        const chatsSnapshot = await FirestoreInstance.collection('chats')
            .where(<keyof ChatModel>'participantsCompleted', '==', false)
            .where(<keyof ChatModel>'id', '!=', 'general')
            .limit(1)
            .get();


        if (chatsSnapshot.size > 0) {
            const foundGroupChat: ChatModel = chatsSnapshot.docs.at(0)!.data() as ChatModel;
            /// chat group found, therefore add  player to chat
            // const generalChatDoc = FirestoreInstance.collection('chats').doc('general');
            // batch.update(generalChatDoc, chatParticipant.toMap(false));
            const limitOfPlayers = 3;
            const updateChat: Partial<ChatModel> = {
                participants: firestore.FieldValue.arrayUnion(<ChatParticipantModel>{
                    displayName: player.displayName,
                    uid: player.uid,
                    canSendMessage: true,
                }),
                participantsUids: firestore.FieldValue.arrayUnion(<string>player.uid),
                participantsCompleted: (foundGroupChat.participantsUids as Array<string>).length + 1 >= limitOfPlayers,
            };
            const chatDoc = FirestoreInstance.collection('chats').doc(foundGroupChat.id);
            batch.update(chatDoc, updateChat);
        } else {
            /// chat group not found, create new
            const chatId = randomIdGenerator(15);
            const newChat: ChatModel = {
                id: chatId,
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

        await batch.commit();
    });
