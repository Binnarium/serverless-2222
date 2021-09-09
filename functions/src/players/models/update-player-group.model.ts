import { PlayerModel } from "./player.model";

export interface UpdatePlayerGroupModel extends Required<Pick<PlayerModel, 'addedToChat' | 'groupId'>> {
}