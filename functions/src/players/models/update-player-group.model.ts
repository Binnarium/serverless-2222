import { firestore } from "firebase-admin";
import { PlayerModel } from "./player.model";

export interface UpdatePlayerGroupModel extends Required<Pick<PlayerModel, 'addedToChat' | 'groupId'>> {
    oldGroups?: firestore.FieldValue | Array<string>;
}