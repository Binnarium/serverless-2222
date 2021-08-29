import { firestore } from "firebase-admin";
import * as functions from "firebase-functions";
import { Index } from 'meilisearch';
import { FirestoreInstance } from "../../utils/configuration";
import { PlayerModel } from "../models/player.model";
import { SearchPlayerQueryModel } from "../models/search-player-query.model";
import { PlayerIndex } from "../repository/players.index";

// when a new player is created add it to the players index
export const addPlayerToSearchIndex = functions.firestore
    .document('players/{uid}')
    .onCreate(async (snapshot, context) => {
        const playerIndex: Index<PlayerModel> = await PlayerIndex();
        const { displayName, email, uid } = <PlayerModel>snapshot.data();
        await playerIndex.addDocuments([{ displayName, email, uid }]);

        // once indexed update document with indexed time
        await FirestoreInstance.doc(snapshot.ref.path).update({ indexedDate: firestore.FieldValue.serverTimestamp() });
    });

/// when a player is removed, remove it from the index
export const removePlayerFromSearchIndex = functions.firestore
    .document('players/{uid}')
    .onDelete(async (snapshot, context) => {
        const playerIndex: Index<PlayerModel> = await PlayerIndex();
        const { uid } = <PlayerModel>snapshot.data();
        await playerIndex.deleteDocument(uid);
    });


/// search players 
export const searchPlayer = functions.https.onCall(async (data: SearchPlayerQueryModel, context): Promise<string | null> => {
    const playerIndex: Index<PlayerModel> = await PlayerIndex();

    /// only valid queries
    if ((data.query ?? '').length === 0)
        return null;

    const search = await playerIndex.search(data.query, { cropLength: 10 });
    return JSON.stringify(search.hits);
});
