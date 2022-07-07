import { firestore } from "firebase-admin";
import * as functions from "firebase-functions";
import { PlayerModel } from "../../players/models/player.model";
import { UpdatePlayerGroupModel } from "../../players/models/update-player-group.model";
import { FirestoreInstance } from "../../utils/configuration";
import { ChatParticipantModel } from "../model/chat-participant.model";
import { ChatModel } from "../model/chat.model";

export const CHAT_movePlayerChat = functions.https.onCall(async (data, context) => {


    const playerId: string | undefined | null = data.playerId;
    const newGroupId: string | undefined | null = data.newGroupId;

    if (!playerId || !newGroupId)
        throw new Error('Bad Parameters')

    ////// get player
    const currentPlayerRef = FirestoreInstance.collection('players').doc(playerId);
    const currentPlayerSnap = await currentPlayerRef.get();
    const currentPlayer: PlayerModel | null | undefined = currentPlayerSnap.data() as PlayerModel ?? null;

    if (!currentPlayer.uid)
        throw new Error('Player or group not found')

    ////// get new chat
    const newChatRef = FirestoreInstance.collection('chats').doc(newGroupId);
    const newChatSnap = await newChatRef.get();
    const newChat: ChatModel | null | undefined = newChatSnap.data() as ChatModel ?? null;

    if (!newChat.id)
        throw new Error('new chat not found')

    ///// here lays the magic
    ///// I mean, here we remove the player from the old group, and add it to the new chat
    const batch = FirestoreInstance.batch();
    let oldGroup = null;
    if (!!currentPlayer.groupId) {
        ////// get old chat ref
        const oldChatRef = FirestoreInstance.collection('chats').doc(currentPlayer.groupId);
        oldGroup = currentPlayer.groupId;
        /// remove from old chat
        const removeCurrentPlayer: Partial<ChatModel> = {
            participants: firestore.FieldValue.arrayRemove(<ChatParticipantModel>{
                displayName: currentPlayer.displayName,
                uid: currentPlayer.uid,
                canSendMessage: true,
            }),
            participantsUids: firestore.FieldValue.arrayRemove(<string>currentPlayer.uid),
        };

        batch.update(oldChatRef, removeCurrentPlayer);
    }

    /// add to new chat
    const addCurrentPlayer: Partial<ChatModel> = {
        participants: firestore.FieldValue.arrayUnion(<ChatParticipantModel>{
            displayName: currentPlayer.displayName,
            uid: currentPlayer.uid,
            canSendMessage: true,
        }),
        participantsUids: firestore.FieldValue.arrayUnion(<string>currentPlayer.uid),
    };

    batch.update(newChatRef, addCurrentPlayer);

    // update player was added to chats
    const playerUpdate: UpdatePlayerGroupModel = {
        addedToChat: true,
        groupId: newGroupId,
        oldGroups: firestore.FieldValue.arrayUnion(oldGroup),
    };

    batch.update(currentPlayerRef, playerUpdate);

    await batch.commit();
});
