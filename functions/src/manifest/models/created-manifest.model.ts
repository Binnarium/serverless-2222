import { ManifestModel } from "./manifest.model";

export interface CreatedManifestModel extends Pick<ManifestModel, 'id' | 'pubUrl' | 'cityId' | 'playerId'> {
}