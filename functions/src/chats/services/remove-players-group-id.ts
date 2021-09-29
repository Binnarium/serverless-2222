import * as functions from "firebase-functions";
import { UpdatePlayerGroupModel } from "../../players/models/update-player-group.model";
import { FirestoreInstance } from "../../utils/configuration";
import { ChatModel } from "../model/chat.model";

/**
 * when deleting a chat, remove its participants. then update all participants
 * group id
 */
export const CHAT_removePlayersGroupId = functions.firestore
    .document('chats/{id}')
    .onDelete(async (snapshot, context) => {
        const chat: Partial<ChatModel> | null = <Partial<ChatModel>>snapshot.data();

        /// when no chat data exists no action required
        if (!chat?.participantsUids)
            return;

        const batch = FirestoreInstance.batch();

        /// obtain participants and update their information
        (<Array<string>>chat.participantsUids).forEach(uid => {
            // update player was removed from chat
            const playerRef = FirestoreInstance.collection('players').doc(uid);
            const playerUpdate: UpdatePlayerGroupModel = { addedToChat: false, groupId: null };

            batch.update(playerRef, playerUpdate);
        })

        await batch.commit();
    });