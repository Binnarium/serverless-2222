import { firestore } from "firebase-admin";
import * as functions from "firebase-functions";
import { FirestoreInstance } from "../../utils/configuration";
import { PlayerModel, UpdatePlayerCourseFlags } from "../models/player.model";


// when a new player is created add it to the players index
export const PLAYER_updatePlayerCourseFlags = functions.firestore
    .document('players/{uid}')
    .onCreate(async (snapshot, context) => {
        const { uid, playerType } = <PlayerModel>snapshot.data();

        const courseStatus = await getCourseStatus(playerType ?? 'PLAYER#INVITED');

        console.log({ playerType, courseStatus });

        /// update player information
        const updateData: UpdatePlayerCourseFlags = {
            allowWebAccess: true,
            courseStatus,
            playerType: playerType ?? 'PLAYER#INVITED',
        };

        const playerRef = FirestoreInstance.collection('players').doc(uid);

        await playerRef.update(updateData);
    });


async function getCourseStatus(playerType: string): Promise<string> {
    if (playerType === 'PLAYER#INVITED')
        return 'COURSE#IN_PROGRESS';

    const appConfSnap = await FirestoreInstance.collection('application').doc('_configuration_').get();
    const appConf = <Record<'courseInitializationDate' | 'courseFinalizationDate', firestore.Timestamp>>appConfSnap.data();

    const startDate = appConf.courseInitializationDate.toDate();
    const endDate = appConf.courseFinalizationDate.toDate();
    const today = new Date();

    if (today < startDate)
        return 'COURSE#NOT_STARTED';

    if (startDate < today && today < endDate)
        return 'COURSE#IN_PROGRESS';

    if (endDate < today)
        return 'COURSE#NOT_APPROVED';

    return 'COURSE#NOT_STARTED';
}