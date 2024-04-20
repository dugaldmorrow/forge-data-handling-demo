import { Job } from "./Job";
import { QueueState } from "./QueueState";

export type DataProcessingContext = {
  dataProcessingJobs: Job<any>[];
  queueState: QueueState;
}
