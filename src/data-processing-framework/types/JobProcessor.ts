import { Job } from "./Job";
import { JobProcessingResult } from "./JobProcessingResult";

export type JobProcessor = {
  getJobTypeId: () => string;
  processJob: (event: any, job: Job<any>) => Promise<JobProcessingResult>;
}
