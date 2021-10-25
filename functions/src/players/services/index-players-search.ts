import * as functions from "firebase-functions";
import { PlayerSearchIndexModel } from "../models/player-search-index.model";
import { PlayerModel } from "../models/player.model";
import { SearchPlayerQueryModel } from "../models/search-player-query.model";
import { PlayerIndex } from "../repository/players.index";

// when a new player is created add it to the players index
export const addPlayerToSearchIndex = functions.firestore
    .document('players/{uid}')
    .onCreate(async (snapshot, context) => {
        const playerIndex = await PlayerIndex();
        const { displayName, email, uid, groupId } = <PlayerModel>snapshot.data();
        await playerIndex.addDocuments([{ displayName, email, uid, groupId }]);
    });

/// when a player is removed, remove it from the index
export const updatePlayerInformationInIndex = functions.firestore
    .document('players/{uid}')
    .onUpdate(async (snapshot, context) => {
        const playerIndex = await PlayerIndex();
        const oldPlayer = <PlayerModel>snapshot.before.data();
        const newPlayer = <PlayerModel>snapshot.after.data();

        /// validate properties that change
        if ((oldPlayer.uid === newPlayer.uid) ||
            (oldPlayer.email === newPlayer.email) ||
            (oldPlayer.displayName === newPlayer.displayName) ||
            (oldPlayer.groupId === newPlayer.groupId))
            return;
        await playerIndex.updateDocuments([{
            displayName: newPlayer.displayName,
            email: newPlayer.email,
            groupId: newPlayer.groupId,
            uid: newPlayer.uid,
        }]);
    });

/// when a player is removed, remove it from the index
export const removePlayerFromSearchIndex = functions.firestore
    .document('players/{uid}')
    .onDelete(async (snapshot, context) => {
        const playerIndex = await PlayerIndex();
        const { uid } = <PlayerModel>snapshot.data();
        await playerIndex.deleteDocument(uid);
    });


/// search players 
export const searchPlayer = functions.https.onCall(async (data: SearchPlayerQueryModel, context): Promise<string | null> => {
    const playerIndex = await PlayerIndex();

    /// only valid queries
    if ((data.query ?? '').length === 0)
        return null;

    const filter: Array<Array<string>> = [];

    // add filters if available
    if (data.groupId)
        filter.push([`${<keyof PlayerSearchIndexModel>'groupId'} = ${data.groupId}`]);

    const search = await playerIndex.search(data.query, { cropLength: 10, filter });
    console.log(search);

    return JSON.stringify(search.hits);
});
