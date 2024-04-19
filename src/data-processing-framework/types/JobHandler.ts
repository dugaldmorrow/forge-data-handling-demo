import { DataProcessingContext } from "./DataProcessingContext";
import { JobProcessor } from "./JobProcessor";

export interface JobHandler {

  registerJobProcessor: (jobProcessor: JobProcessor) => void;

  processQueueItem: (queueItem: any) => Promise<void>;

  enqueueJob: (event: any, context: DataProcessingContext, delayInSeconds?: number) => Promise<void>;

}
