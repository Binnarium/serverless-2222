import * as functions from "firebase-functions";
import { ClubhouseModel } from "../../clubhouse/models/clubhouse.model";
import { MedalModel, PlayerModel } from "../../players/models/player.model";
import { FirestoreInstance } from "../../utils/configuration";
import { ProjectModel } from "../models/project-award.model";

/**
 * backup function to recalculate the awards obtained by the player
 * in case the awards are desynchronized
 */
export const AWARDS_recalculateAwards = functions.https.onCall(async (data: { uid?: string } | undefined, _) => {
    const playerUid = data?.uid ?? null;

    /// validate params required are valid
    if (playerUid === null)
        return { ok: false, code: 'missing-uid', message: 'Missing the parameter playerUid' };

    await _CalculateAwardsAndSave(playerUid);

    return { ok: true };
});

/**
 * when a new project file is uploaded, then update the medals of the player
 */
export const AWARDS_updateMedalsOnClubhouseCreate = functions.firestore.document('players/{uid}/clubhouse/{projectId}').onCreate(async (_, context) => {
    const { uid } = context.params;

    await _CalculateAwardsAndSave(uid);
});

/**
 * when a new project file is uploaded, then update the medals of the player
 */
export const AWARDS_updateMedalsOnClubhouseDelete = functions.firestore.document('players/{uid}/clubhouse/{projectId}').onDelete(async (_, context) => {
    const { uid } = context.params;

    await _CalculateAwardsAndSave(uid);
});
/**
 * when a new project file is uploaded, then update the medals of the player
 */
export const AWARDS_updateMedalsOnProjectCreate = functions.firestore.document('players/{uid}/project/{projectId}').onCreate(async (_, context) => {
    const { uid } = context.params;

    await _CalculateAwardsAndSave(uid);
});

/**
 * when a new project file is uploaded, then update the medals of the player
 */
export const AWARDS_updateMedalsOnProjectDelete = functions.firestore.document('players/{uid}/project/{projectId}').onDelete(async (_, context) => {
    const { uid } = context.params;

    await _CalculateAwardsAndSave(uid);
});

async function _CalculateAwardsAndSave(uid: string) {
    /// get medals obtained
    const projectAwards = await _CalculateProjectAwards(uid);
    const clubhouseAwards = await _CalculateClubhouseAwards(uid);
    const contributionsAwards: PlayerModel['contributionsAwards'] = [];

    /// update the obtained medals & counter
    const updatePayload: Partial<PlayerModel> = {
        proactivity: projectAwards.length + clubhouseAwards.length + contributionsAwards.length,
        projectAwards,
        clubhouseAwards,
        contributionsAwards,
    };

    const playerRef = FirestoreInstance.collection('players').doc(uid);

    await playerRef.update(updatePayload);
}

async function _CalculateProjectAwards(uid: string): Promise<MedalModel[]> {

    const filesUploadedQuery = FirestoreInstance.collection('players').doc(uid).collection('project')
        .orderBy(<keyof ProjectModel>'cityId');

    const { docs: uploadedProjectFiles } = await filesUploadedQuery.get();

    const groups = uploadedProjectFiles
        .map(snap => snap.exists ? snap.data() as ProjectModel : null)

        /// group files 
        .reduce(
            (acc, file) => {
                if (!file)
                    return acc;

                /// create record in case not created
                if (!acc[file.cityId])
                    acc[file.cityId] = [];

                /// add new medal
                acc[file.cityId].push(file);
                return acc;
            },
            <{ [city: string]: ProjectModel[] }>{},
        );

    return Object.entries(groups)
        .map(([cityId, { length }]) => (<MedalModel>{ cityId: cityId, obtained: length > 0, count: length, }));
}

async function _CalculateClubhouseAwards(uid: string): Promise<MedalModel[]> {

    const clubhouseQuery = FirestoreInstance.collection('players').doc(uid).collection('clubhouse')
        .orderBy(<keyof ClubhouseModel>'cityId');

    const { docs: clubhouseEvents } = await clubhouseQuery.get();

    const groups = clubhouseEvents
        .map(snap => snap.exists ? snap.data() as ClubhouseModel : null)

        /// group files 
        .reduce(
            (acc, event) => {
                if (!event)
                    return acc;

                /// create record in case not created
                if (!acc[event.cityId])
                    acc[event.cityId] = [];

                /// add new medal
                acc[event.cityId].push(event);
                return acc;
            },
            <{ [city: string]: ClubhouseModel[] }>{},
        );

    return Object.entries(groups)
        .map(([cityId, { length }]) => (<MedalModel>{ cityId: cityId, obtained: length > 0, count: length, }));
}
