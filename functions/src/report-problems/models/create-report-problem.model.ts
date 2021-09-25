import { ReportProblemModel } from "./report-problem.model";

export interface CreateReportProblemModel extends Pick<ReportProblemModel, 'payload' | 'problem'> { }
