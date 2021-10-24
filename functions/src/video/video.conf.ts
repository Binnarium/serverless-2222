import { v1 } from "@google-cloud/video-transcoder";

export const videosBucket = 'gs://video-2222/';
// Instantiates a client
export const transcoderServiceClient = new v1.TranscoderServiceClient();
