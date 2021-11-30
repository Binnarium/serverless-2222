import * as functions from "firebase-functions";
import { PlayerModel } from "../../players/models/player.model";
import { FirestoreInstance } from "../../utils/configuration";
import { InscriptionModel } from "../models/inscription.model";

// when a new player is created add it to the players index
export const INSCRIPTION_markRegisteredPlayers = functions
    .runWith({ memory: '2GB', timeoutSeconds: 540 })
    .https.onRequest(async (req, res) => {
        try {

            const inscriptionsQuery = FirestoreInstance.collection('inscribed-players')
            // .where(<keyof InscriptionModel>'hasRegistered', '==', false);

            const snapshots = await inscriptionsQuery.get();
            const inscriptions: Array<InscriptionModel> = snapshots.docs.map(d => d.data() as InscriptionModel);
            console.log({ len: inscriptions.length });
            for await (const inscription of inscriptions) {

                const playerRef = FirestoreInstance.collection('players')
                    .where(<keyof PlayerModel>'email', '==', inscription.email);

                const snap = await playerRef.get();
                const found = !snap.empty;

                const inscriptionRef = FirestoreInstance.collection('inscribed-players').doc(inscription.email);

                await inscriptionRef.update(<Partial<InscriptionModel>>{ hasRegistered: found });
            }
            res.json({ ok: true })
        } catch (error) {
            console.error(error);
            res.json({ ok: false })
        }
    });