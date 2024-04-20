import { TaskStatus } from "./TaskStatus";

export type StatusChangeHandler = (
  event: any,
  taskStatus: TaskStatus,
  percent?: number,
  message?: string) => Promise<void>;
