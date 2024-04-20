import { initialUserJobConfig, userJobProcessor } from "./userProcessor";
import { initialSpaceJobConfig, spaceJobProcessor } from "./spaceProcessor";
import { popLogContext, pushLogContext } from "../data-processing-framework/process/log";
import { Job } from "../data-processing-framework/types/Job";
import { DataProcessingContext } from "../data-processing-framework/types/DataProcessingContext";
import { getJobHandler } from "../data-processing-framework/process/dataProcessor";
import { TaskStatus } from "src/data-processing-framework/types/TaskStatus";

/**
 * This function is called each time the status of the processing changes.
 */
const onStatusChanged = async (event: any, taskStatus: TaskStatus, percent?: number, message?: string) => {
  // Optionally react to status change events here.
}

/**
 * Wire up the job processors and status change handler with the job handler.
 */
const jobHandler = getJobHandler();
jobHandler.setStatusChangeHandler(onStatusChanged);
jobHandler.registerJobProcessor(spaceJobProcessor);
jobHandler.registerJobProcessor(userJobProcessor);

/**
 * This is a callback from the data-processing-framework that allows the
 * event to be constructed with the data required to support the processing of the event.
 * @param payload 
 * @returns an event object that will be passed to job processors.
 */
export const createEventFromMacroStartDataProcessingTrigger = async (): Promise<any> => {
  const event = {};
  return event;
}

/**
 * This callback is invoked by the data-processing-framework macro via a resolver.
 */
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
