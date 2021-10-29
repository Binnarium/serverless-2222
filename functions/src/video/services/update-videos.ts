import * as functions from "firebase-functions";
import { TranscodeVideo, TranscodeVideoWithPath } from "../transcode-video";
import { VideoModel } from "../video.model";

export const VIDEO_updateWelcomeVideo = functions.firestore
    .document('cities/welcome')
    .onUpdate(async (snapshot, _) => {
        const oldData = <{ welcomeVideo?: VideoModel }>snapshot.before.data();
        const newData = <{ welcomeVideo?: VideoModel }>snapshot.after.data();

        /// validate if video has changed
        if (!!newData.welcomeVideo && oldData.welcomeVideo?.path !== newData.welcomeVideo?.path)
            await TranscodeVideo(newData.welcomeVideo!);
    });

export const VIDEO_updateClubhouseExplanation = functions.firestore
    .document('application/clubhouse-explanation')
    .onUpdate(async (snapshot, _) => {
        const oldData = <{ video?: VideoModel }>snapshot.before.data();
        const newData = <{ video?: VideoModel }>snapshot.after.data();

        /// validate if video has changed
        if (!!newData.video && oldData.video?.path !== newData.video?.path)
            await TranscodeVideo(newData.video!);
    });

export const VIDEO_updateCityContentVideo = functions.firestore
    .document('/cities/{cityId}/pages/content')
    .onUpdate(async (snapshot, _) => {
        const oldData = <undefined | { content: undefined | Array<VideoModel & { kind: string, }> }>snapshot.before.data();
        const newData = <undefined | { content: undefined | Array<VideoModel & { kind: string, }> }>snapshot.after.data();

        /// validate if video has changed
        if (!newData)
            return;


        for await (const current of newData.content ?? []) {

            /// check if content is video
            if (current.kind !== 'CONTENT#VIDEO')
                continue;

            /// if current exists in old data, dont update nothing
            const coincidence = oldData?.content?.find(e => e?.path === current.path);

            if (!!coincidence)
                continue;

            console.log(`procesing video ${current.path}`);
            await TranscodeVideo(current);
        }

    });

export const VIDEO_updateContributionExplanation = functions.firestore
    .document('application/contribution-explanation')
    .onUpdate(async (snapshot, _) => {
        const oldData = <{ video?: VideoModel }>snapshot.before.data();
        const newData = <{ video?: VideoModel }>snapshot.after.data();

        /// validate if video has changed
        if (!!newData.video && oldData.video?.path !== newData.video?.path)
            await TranscodeVideo(newData.video!);
    });

export const VIDEO_updateVideoOnChatMessage = functions.firestore
    .document('chats/{chatId}/messages/{messageId}')
    .onCreate(async (snapshot, _) => {
        const data = <{ kind: string, asset?: VideoModel }>snapshot.data();

        if (data.kind !== 'MESSAGE#VIDEO')
            return;
        await TranscodeVideo(data.asset!);
    });

export const VIDEO_transcodeVideo = functions.https.onCall(async (data: undefined | { path?: string }, _) => {
    try {
        const path = data?.path ?? null;

        /// validate if video has changed
        if (!!path)
            await TranscodeVideoWithPath(path);
        return true;
    } catch (error) {
        return false;
    }
});
