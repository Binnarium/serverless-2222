import { ChatModel } from "./chat.model";

export interface ChatIndexModel extends Pick<ChatModel, 'id' | 'name' | 'participantsUids'> {
    participantsNames: Array<string>;
}