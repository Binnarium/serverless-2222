import { firestore } from "firebase-admin";
import * as functions from "firebase-functions";
import { Index } from 'meilisearch';
import { FirestoreInstance } from "../../utils/configuration";
import { ChatIndexModel } from "../model/chat-index.model";
import { ChatParticipantModel } from "../model/chat-participant.model";
import { ChatModel } from "../model/chat.model";
import { SearchChatQueryModel } from "../model/search-chat-query.model";
import { ChatsIndex } from "../repository/chat.index";

export const addChatToSearchIndex = functions.firestore
    .document('chats/{id}')
    .onWrite(async (snapshot, context) => {
        const chatIndex: Index<ChatIndexModel> = await ChatsIndex();
        const before: ChatModel | null = <ChatModel>snapshot.before.data() ?? null; // might be null on creating
        const after: ChatModel | null = <ChatModel>snapshot.after.data() ?? null; // might be null when deleting

        /// dont index if deleted, only created
        if (!after)
            return;

        /// update index only when participants change
        /// participants stay the same, therefore don't update the index
        if ((before?.participantsUids as Array<string>)?.length === (after.participantsUids as Array<string>).length)
            return;

        await chatIndex.updateDocuments([{
            id: after.id,
            name: after.name ?? null,
            participantsNames: (<Array<ChatParticipantModel>>after.participants).map(p => p.displayName),
            participantsUids: after.participantsUids,
        }]);

        // once indexed update document with indexed time
        await FirestoreInstance.doc(snapshot.after.ref.path).update(<Partial<ChatModel>>{ indexedDate: firestore.FieldValue.serverTimestamp() });
    });

export const removeChatFromSearchIndex = functions.firestore
    .document('chats/{id}')
    .onDelete(async (snapshot, context) => {
        const chatIndex: Index<ChatIndexModel> = await ChatsIndex();
        const { id } = <ChatModel>snapshot.data();
        await chatIndex.deleteDocument(id);
    });


export const searchChat = functions.https.onCall(async (data: SearchChatQueryModel, context): Promise<string | null> => {
    const chatIndex: Index<ChatIndexModel> = await ChatsIndex();

    /// only valid queries
    if ((data.query ?? '').length === 0)
        return null;

    const search = await chatIndex.search(data.query, { cropLength: 10, filter: [[`${<keyof ChatIndexModel>'participantsUids'} = ${data.playerId}`]] });
    return JSON.stringify(search.hits);
});
