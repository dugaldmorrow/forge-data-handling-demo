import { Job } from "./Job";
import { JobProcessingResult } from "./JobProcessingResult";

export type JobProcessor = {
  processJob: (job: Job<any>) => Promise<JobProcessingResult>;
}
