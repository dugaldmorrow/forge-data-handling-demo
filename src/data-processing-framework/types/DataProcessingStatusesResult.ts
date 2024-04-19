import { Cursor } from "./Cursor";
import { DataProcessingStatus } from "./DataProcessingStatus";

export type DataProcessingStatusesResult = {
  statuses: DataProcessingStatus[];
  cursor: Cursor;
}
