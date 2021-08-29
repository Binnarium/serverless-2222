import { Index } from 'meilisearch';
import { MeiliClient } from "../../utils/configuration";
import { ChatIndexModel } from '../model/chat-index.model';

export async function ChatsIndex(): Promise<Index<ChatIndexModel>> {
    try {
        return await MeiliClient.getIndex('chats');
    } catch (error) {
        const index = await MeiliClient.createIndex('chats', { primaryKey: <keyof ChatIndexModel>'id' });
        return index
    }
};
