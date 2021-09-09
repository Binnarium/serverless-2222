import { PlayerModel } from "./player.model";

export interface PlayerSearchIndexModel extends Pick<PlayerModel, 'uid' | 'displayName' | 'email' | 'groupId'> { }