import { Job } from "./Job";
import { JobProcessingResult } from "./JobProcessingResult";

export type JobProcessor = {
  getJobTypeId: () => string;
  processJob: (job: Job<any>) => Promise<JobProcessingResult>;
}
