
export type JobProgress = {
  jobCompletionCount: number;
  jobCount: number;
  percentComplete: number;

  // The following help demonstrate the state in the UI
  queueSize: number;
  totalSuccessCount: number;
  totalRetryCount: number;
}
