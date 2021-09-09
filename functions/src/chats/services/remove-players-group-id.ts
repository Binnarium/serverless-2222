import * as functions from "firebase-functions";
import { UpdatePlayerGroupModel } from "../../players/models/update-player-group.model";
import { FirestoreInstance } from "../../utils/configuration";
import { ChatModel } from "../model/chat.model";

export const removePlayersGroupId = functions.firestore
    .document('chats/{id}')
    .onDelete(async (snapshot, context) => {
        const batch = FirestoreInstance.batch();
        const chat = <ChatModel>snapshot.data();

        (chat.participantsUids as Array<string>).forEach(uid => {
            // update player was removed from chat
            const playerRef = FirestoreInstance.collection('players').doc(uid);
            const playerUpdate: UpdatePlayerGroupModel = { addedToChat: false, groupId: null };

            batch.update(playerRef, playerUpdate);
        })

        await batch.commit();
    });