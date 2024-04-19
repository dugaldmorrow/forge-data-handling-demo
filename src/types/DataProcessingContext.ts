import { Job } from "./Job";
import { QueueState } from "./QueueState";
import { RetryContext } from "./RetryContext";

export type DataProcessingContext = {
  dataProcessingJobs: Job<any>[];
  queueState: QueueState;
  retryContext: RetryContext;
}
