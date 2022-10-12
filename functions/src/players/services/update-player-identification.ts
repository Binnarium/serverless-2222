import * as functions from "firebase-functions";
import { InscriptionModel } from "../../inscriptions/models/inscription.model";
import { FirestoreInstance } from "../../utils/configuration";
import { PlayerModel, UpdatePlayerIdentification } from "../models/player.model";


// when a new player is created add it to the players index
export const PLAYER_updatePlayerIdentifications = functions.firestore
    .document('players/{uid}')
    .onCreate(async (snapshot, context) => {
        const { uid, email } = <PlayerModel>snapshot.data();

        const inscriptionRef = FirestoreInstance.collection('inscribed-players').doc(email);
        const inscription = (await inscriptionRef.get()).data() as InscriptionModel;


        const updateData: UpdatePlayerIdentification = {
            identification: inscription.identification,
        };

        const playerRef = FirestoreInstance.collection('players').doc(uid);
        await playerRef.update(updateData);
    });
