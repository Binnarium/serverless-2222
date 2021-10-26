export interface AssetModel {

}

export interface ProjectModel {
    cityId: string;
    kind: string;
    id: string;
    file: AssetModel;
}