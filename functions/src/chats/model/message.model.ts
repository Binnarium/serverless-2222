import { firestore } from "firebase-admin";

export interface MessageModel {
    sendedDate: firestore.FieldValue | firestore.Timestamp;
    // TODO: add other properties
}


export interface UpdateMessageSendedDate extends Pick<MessageModel, 'sendedDate'> {
    sendedDate: firestore.FieldValue;
}