import { TaskStatus } from "./TaskStatus";

export type Job<JobContext> = {
  jobTypeId: string;
  status: undefined | TaskStatus;
  jobContext: JobContext;
}
