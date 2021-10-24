import * as functions from "firebase-functions";
import { DatabaseInstance, StorageInstance } from "../../utils/configuration";
import { transcoderServiceClient, videosBucket } from "../video.conf";


///  
export const VIDEO_completed_callback = functions.pubsub.topic('VIDEO_completed').onPublish(async (message, context) => {

    const request = {
        name: message.json.job.name,
    };

    if (!request.name)
        throw Error('Job could not be match');

    const [job] = await transcoderServiceClient.getJob(request);

    /// get path
    const uri = job.config?.output?.uri?.split('/');
    if (!uri)
        throw Error('No uri found');

    if (uri.length !== 5)
        throw Error('Bad uri format');

    const path = uri[3];


    const [files] = await StorageInstance.bucket(videosBucket).getFiles({ directory: path });

    let previewUrl: string | null = null;
    let hdUrl: string | null = null;
    let sdUrl: string | null = null;


    var d = new Date();
    var year = d.getFullYear();
    var month = d.getMonth();
    var day = d.getDate();
    var nextYear = new Date(year + 1, month, day);

    for await (const file of files) {
        const name = file.name;
        const [downloadUrl] = await file.getSignedUrl({ action: 'read', expires: nextYear });
        if (name.includes('hd.mp4'))
            hdUrl = downloadUrl;
        else if (name.includes('sd.mp4'))
            sdUrl = downloadUrl;
        else if (name.includes('.jpeg'))
            previewUrl = downloadUrl;
    }

    const ref = DatabaseInstance.ref(`videos/${path}`);
    await ref.set({
        previewUrl,
        hdUrl,
        sdUrl,
        path,
    });

    /// CLEAN UP
    await transcoderServiceClient.deleteJob(job);
})
