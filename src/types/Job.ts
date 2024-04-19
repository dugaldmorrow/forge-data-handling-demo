import { JobTypeId } from "./JobTypeId";
import { TaskStatus } from "./TaskStatus";

export type Job<JobContext> = {
  jobTypeId: JobTypeId;
  status: undefined | TaskStatus;
  jobContext: JobContext;
}
