import { protos } from '@google-cloud/video-transcoder';
import { DatabaseInstance, projectId } from "../utils/configuration";
import { transcoderServiceClient, videosBucket } from './video.conf';
import { VideoModel } from "./video.model";

const location = 'us-central1';



export async function TranscodeVideo(video: VideoModel) {

    const clearPath = video.path
        .replace(/[&/\\#, +()$~%.'":*?<>{}]/g, '_')

    /// validate video doesn't exist yet
    const ref = DatabaseInstance.ref(`videos/${clearPath}`);
    const snap = await ref.get();

    if (snap.exists())
        return;

    // Construct request
    const request: protos.google.cloud.video.transcoder.v1.ICreateJobRequest = {
        parent: transcoderServiceClient.locationPath(projectId, location),
        job: {
            inputUri: `gs://lab-movil-2222.appspot.com/${video.path}`,
            outputUri: `${videosBucket}${clearPath}/`,
            config: {
                pubsubDestination: { topic: `projects/${projectId}/topics/${'VIDEO_completed'}` },
                elementaryStreams: [
                    {
                        key: 'video-stream0',
                        videoStream: {
                            h264: {
                                heightPixels: 360,
                                widthPixels: 640,
                                bitrateBps: 550000,
                                frameRate: 30,
                            },
                        },
                    },
                    {
                        key: 'video-stream1',
                        videoStream: {
                            h264: {
                                heightPixels: 720,
                                widthPixels: 1280,
                                bitrateBps: 2500000,
                                frameRate: 30,
                            },
                        },
                    },
                    {
                        key: 'audio-stream0',
                        audioStream: {
                            codec: 'aac',
                            bitrateBps: 64000,
                        },
                    },
                ],
                muxStreams: [
                    {
                        key: 'sd',
                        container: 'mp4',
                        elementaryStreams: ['video-stream0', 'audio-stream0'],
                    },
                    {
                        key: 'hd',
                        container: 'mp4',
                        elementaryStreams: ['video-stream1', 'audio-stream0'],
                    },
                ],

                spriteSheets: [
                    {
                        filePrefix: 'preview',
                        spriteHeightPixels: 360,
                        spriteWidthPixels: 640,
                        columnCount: 10,
                        rowCount: 1,
                        totalCount: 10,
                    },
                ],
            },
        },
    };

    // Run request
    await transcoderServiceClient.createJob(request);


}