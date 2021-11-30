import * as functions from "firebase-functions";
import { PlayerModel } from "../../players/models/player.model";
import { FirestoreInstance } from "../../utils/configuration";
import { InscriptionModel } from "../models/inscription.model";

// when a new player is created add it to the players index
export const INSCRIPTION_markInscription = functions.firestore
    .document('players/{uid}')
    .onCreate(async (snapshot, _) => {
        const { email } = <PlayerModel>snapshot.data();

        const inscriptionRef = FirestoreInstance.collection('inscribed-players').doc(email);

        await inscriptionRef.update(<Partial<InscriptionModel>>{ hasRegistered: true });
    });