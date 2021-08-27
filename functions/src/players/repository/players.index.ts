import * as functions from "firebase-functions";
import { Index, MeiliSearch } from 'meilisearch';
import { PlayerModel } from "../models/player.model";

const client = new MeiliSearch({
    host: functions.config().meilisearch.host,
    apiKey: functions.config().meilisearch.api_key,
});

export async function PlayerIndex(): Promise<Index<PlayerModel>> {
    try {
        return await client.getIndex('players');
    } catch (error) {
        return await client.createIndex('players', { primaryKey: 'uid' });
    }
};
