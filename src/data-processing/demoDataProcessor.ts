import { initialUserJobConfig, userJobProcessor } from "./userProcessor";
import { initialSpaceJobConfig, spaceJobProcessor } from "./spaceProcessor";
import { popLogContext, pushLogContext } from "../data-processing-framework/process/log";
import { Job } from "../data-processing-framework/types/Job";
import { DataProcessingContext } from "../data-processing-framework/types/DataProcessingContext";
import { getJobHandler } from "../data-processing-framework/process/dataProcessor";
import { TaskStatus } from "src/data-processing-framework/types/TaskStatus";

const onStatusChanged = async (event: any, taskStatus: TaskStatus, percent?: number, message?: string) => {
  // Optionally react to status change events here.
}

const jobHandler = getJobHandler();
jobHandler.setStatusChangeHandler(onStatusChanged);
jobHandler.registerJobProcessor(spaceJobProcessor);
jobHandler.registerJobProcessor(userJobProcessor);

export const onStartDemoDataProcessing = async (event: any, context: DataProcessingContext) => {
  pushLogContext('onStartDemoDataProcessing');
  const initialJobConfig: Job<any>[] = [
    initialSpaceJobConfig,
    initialUserJobConfig
  ]
  context.dataProcessingJobs = initialJobConfig;
  jobHandler.enqueueJob(event, context);
  popLogContext();
}
