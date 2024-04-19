import { TaskStatus } from "src/types/TaskStatus";
import { JobProgress } from "./JobProgress";

export type DataProcessingStatus = {
  dataProcessingId: string;
  dataProcessingStartTime: number;
  status: TaskStatus;
  jobProgress: JobProgress;
  message: string;
}
