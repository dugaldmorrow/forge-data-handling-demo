import { TaskStatus } from "src/types/TaskStatus";
import { JobProgress } from "./JobProgress";

export type DataProcessingStatus = {
  dataProcessingId: string;
  status: TaskStatus;
  jobProgress: JobProgress;
  message: string;
}
