import { Index } from 'meilisearch';
import { MeiliClient } from "../../utils/configuration";
import { PlayerSearchIndexModel } from '../models/player-search-index.model';

export async function PlayerIndex(): Promise<Index<PlayerSearchIndexModel>> {
    try {
        const index = await MeiliClient.getIndex('players');
        return index
    } catch (error) {
        const index = await MeiliClient.createIndex('players', { primaryKey: <keyof PlayerSearchIndexModel>'uid' });
        await index.updateFilterableAttributes(<Array<keyof PlayerSearchIndexModel>>['chatId']);
        await index.updateSearchableAttributes(<Array<keyof PlayerSearchIndexModel>>['displayName', 'email']);
        return index
    }
};
