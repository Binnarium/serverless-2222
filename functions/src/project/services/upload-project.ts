import * as functions from "firebase-functions";
import { FirestoreInstance, StorageInstance } from "../../utils/configuration";


export const PROJECT_uploadProject = functions.storage.object().onFinalize(async (object, context) => {
    const fileBucket = object.bucket; // The Storage bucket that contains the file.
    const filePath = object.name; // File path in the bucket.
    const contentType = object.contentType; // File content type.

    if (!fileBucket || !filePath || !contentType)
        return;

    const bucket = StorageInstance.bucket(object.bucket);
    const fileObj = bucket.file(filePath);
    const signed = await fileObj.getSignedUrl({
        action: 'read',
        expires: '03-01-2500',
    });

    const [root, playerId, cityId, name] = filePath.split('/') ?? [];

    if (root !== 'players')
        return;
    console.log(signed);
    const file = {
        url: signed[0],
        path: filePath,
        name
    };
    const kind = contentType.toLowerCase().includes('pdf') ? 'PROJECT#PDF' : 'PROJECT#MP3';
    const id = `${Date.now()}`;

    const payload = {
        cityId,
        file,
        kind,
        id,
    };

    /// already exists


    const res = await FirestoreInstance
        .collection('players')
        .doc(playerId)
        .collection('project')
        .where('file.path', '==', `players/${playerId}/${cityId}//${name}`)
        .get();

    if (res.size > 0)
        return;

    await FirestoreInstance
        .collection('players')
        .doc(playerId)
        .collection('project')
        .doc(id)
        .set(payload);
    console.log({ payload, playerId });
});