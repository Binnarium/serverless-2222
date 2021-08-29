import { Index } from 'meilisearch';
import { MeiliClient } from "../../utils/configuration";
import { PlayerModel } from "../models/player.model";

export async function PlayerIndex(): Promise<Index<PlayerModel>> {
    try {
        return await MeiliClient.getIndex('players');
    } catch (error) {
        return await MeiliClient.createIndex('players', { primaryKey: <keyof PlayerModel>'uid' });
    }
};
