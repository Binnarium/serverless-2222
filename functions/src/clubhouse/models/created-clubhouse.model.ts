import { ClubhouseModel } from "./clubhouse.model";

export type CreatedClubhouseModel = Pick<ClubhouseModel, 'id' | 'cityId' | 'clubhouseUrl' | 'uploaderId'>;