import * as functions from "firebase-functions";
import { FirestoreInstance } from "../../utils/configuration";
import { PlayerModel } from "../models/player.model";


// when a new player is created add it to the players index
export const PLAYER_exportPlayers = functions.runWith({ timeoutSeconds: 540 }).https
    .onRequest(async (_, res) => {
        const playerRef = FirestoreInstance.collection('players')
            .where(<keyof PlayerModel>'playerType', '==', 'PLAYER#2000');

        const snaps = await playerRef.get();
        const players = snaps.docs.map(snap => snap.data() as PlayerModel);

        const headers = ['Código', 'Nombre', 'Correo', 'Uso Código PubPub', 'Wiki', 'Clubhouse', 'Proyecto', 'Maraton', 'Id de Grupo'];
        const docsData = players.map(
            ({ displayName, email, uid, pubUserId, projectAwards, marathonAwards, clubhouseAwards, contributionsAwards, groupId }) =>
            ([
                uid,
                displayName,
                email,
                !!pubUserId ? 'SI' : 'NO',
                (<[] | null>contributionsAwards)?.length ?? 0,
                (<[] | null>clubhouseAwards)?.length ?? 0,
                (<[] | null>projectAwards)?.length ?? 0,
                (<[] | null>marathonAwards)?.length ?? 0,
                groupId,
            ])
        );

        const separator = ';';
        const data = [headers, ...docsData];
        const csv = data.map(row => row.join(separator)).join(`${separator}\n`);

        res.type('application/pdf')
            .header('Content-Disposition', 'attachment; filename="jugadores.csv"')
            .send(csv);

    });
