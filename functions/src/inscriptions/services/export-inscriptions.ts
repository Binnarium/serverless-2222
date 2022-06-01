import * as functions from "firebase-functions";
import { InscriptionModel } from "../../inscriptions/models/inscription.model";
import { FirestoreInstance } from "../../utils/configuration";

// when a new player is created add it to the players index
export const INSCRIPTIONS_exportInscriptions = functions.runWith({ timeoutSeconds: 540 }).https
    .onRequest(async (_, res) => {
        const playerRef = FirestoreInstance.collection('inscribed-players')
            .where(<keyof InscriptionModel>'playerType', '==', 'PLAYER#2000');

        const snaps = await playerRef.get();
        const players = snaps.docs.map(snap => snap.data() as InscriptionModel);

        const headers = ['Nombres', 'Apellidos', 'Correo', 'Se ha Registrado?'];
        const docsData = players.map(
            ({ name, lastName, hasRegistered, email }) =>
            ([
                name,
                lastName,
                email,
                !!hasRegistered ? 'SI' : 'NO',
            ])
        );

        const separator = ';';
        const data = [headers, ...docsData];
        const csv = data.map(row => row.join(separator)).join(`${separator}\n`);

        res.type('application/csv; charset=utf-8')
            .header('Content-Disposition', 'attachment; filename="inscripciones.csv"')
            .send(csv);

    });
