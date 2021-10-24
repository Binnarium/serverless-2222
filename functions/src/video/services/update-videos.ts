import * as functions from "firebase-functions";
import { TranscodeVideo } from "../transcode-video";
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
