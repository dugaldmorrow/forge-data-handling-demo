import { DataProcessingContext } from "./DataProcessingContext";

export interface JobHandler {

  processQueueItem: (queueItem: any) => Promise<void>;

  enqueueJob: (event: any, context: DataProcessingContext, delayInSeconds?: number) => Promise<void>;

}
