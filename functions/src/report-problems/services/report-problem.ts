import * as functions from "firebase-functions";
import { FirestoreInstance } from "../../utils/configuration";
import { CreateReportProblemModel } from "../models/create-report-problem.model";
import { ReportProblemModel } from "../models/report-problem.model";

export const reportVideo = functions.https.onCall(async (data: CreateReportProblemModel, _): Promise<boolean> => {

    /// only valid queries
    if (!data)
        return false;

    try {
        const report: ReportProblemModel = {
            ...data,
            kind: 'PROBLEM#VIDEO',
            solved: false,
        };

        await FirestoreInstance.collection('reports').add(report);
        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
});
