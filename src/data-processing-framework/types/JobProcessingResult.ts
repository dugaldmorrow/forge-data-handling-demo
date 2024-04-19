import { RetryInfo } from "./RetryInfo"

export type JobProcessingResult = {
  ok: boolean;
  retryInfo?: RetryInfo
}
