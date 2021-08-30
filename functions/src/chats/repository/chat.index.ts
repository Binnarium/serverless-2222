import { Index } from 'meilisearch';
import { MeiliClient } from "../../utils/configuration";
import { ChatIndexModel } from '../model/chat-index.model';

export async function ChatsIndex(): Promise<Index<ChatIndexModel>> {
    try {
        const index = await MeiliClient.getIndex('chats');
        return index;
    } catch (error) {
        const index = await MeiliClient.createIndex('chats', { primaryKey: <keyof ChatIndexModel>'id' });
        await index.updateFilterableAttributes(<Array<keyof ChatIndexModel>>['participantsUids']);
        await index.updateSearchableAttributes(<Array<keyof ChatIndexModel>>['name', 'participantsNames', 'name']);
        return index
    }
};
