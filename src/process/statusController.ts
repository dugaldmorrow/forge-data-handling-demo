import { storage, startsWith } from "@forge/api";
import { TaskStatus } from '../types/TaskStatus';
import { Job } from "../types/Job";
import { DataProcessingStatus } from "../types/DataProcessingStatus";
import { Cursor } from "../types/Cursor";
import { DataProcessingStatusesResult } from "../types/DataProcessingStatusesResult";
import { log, popLogContext, pushLogContext } from "./log";
import { JobProgress } from "../types/JobProgress";
import { DataProcessingContext } from "../types/DataProcessingContext";

const storageKeyPrefix = `data-processing-job-`;

const buildDataProcessingStatusStorageKey = (dataProcessingId) => {
  return `${storageKeyPrefix}${dataProcessingId}`;
}

export const getDataProcessingStatus = async (dataProcessingId: string): Promise<undefined | TaskStatus> => {
  pushLogContext(`getDataProcessingStatuses:`);
  const storageKey = buildDataProcessingStatusStorageKey(dataProcessingId);
  const status = await storage.get(storageKey);
  log(` * retrieved status: ${JSON.stringify(status)}`);
  popLogContext();
  return status;
}

export const updateDataProcessingStatus = async (
    dataProcessingId: string,
    dataProcessingStartTime: number,
    status: TaskStatus,
    jobProgress: JobProgress,
    message?: string) => {
  pushLogContext(`updateDataProcessingStatus:`);
  const dataProcessingStatus: DataProcessingStatus = {
    dataProcessingId: dataProcessingId,
    dataProcessingStartTime: dataProcessingStartTime,
    status: status,
    jobProgress: jobProgress,
    message: message ?? ''
  };
  log(` * Setting data processing status for ${dataProcessingId}: ${JSON.stringify(dataProcessingStatus)}`);
  const storageKey = buildDataProcessingStatusStorageKey(dataProcessingId);
  await storage.set(storageKey, dataProcessingStatus);
  popLogContext();
}

export const computeJobProgress = (context: DataProcessingContext): JobProgress => {
  pushLogContext(`computeJobProgress:`);
  const jobProgress: JobProgress = {
    jobCompletionCount: 0,
    jobCount: 0,
    percentComplete: 0,
    queueSize: context.queueState.queueSize,
    totalSuccessCount: 0,
    totalRetryCount: 0
  }
  const jobs = context.dataProcessingJobs;
  if (jobs) {
    jobProgress.jobCount = jobs.length;
    jobProgress.jobCompletionCount = jobs.filter((job: Job<any>) => job.status === 'DONE_SUCCESS' || job.status === 'DONE_FAILED').length;
    jobProgress.percentComplete = Math.floor((jobProgress.jobCompletionCount / (1.0 * jobProgress.jobCount)) * 100);
    for (const job of jobs) {
      if (job.jobContext && job.jobContext.totalSuccessCount !== undefined) {
        jobProgress.totalSuccessCount += job.jobContext.totalSuccessCount;
      }
      if (job.jobContext && job.jobContext.totalRetryCount !== undefined) {
        jobProgress.totalRetryCount += job.jobContext.totalRetryCount;
      }
    }
    log(` * ${jobProgress.jobCompletionCount} of ${jobProgress.jobCount} jobs completed. Percent complete: ${jobProgress.percentComplete}%`) 
  } else {
    log(` * migrationJobs is undefined. Cannot compute percent complete.`);
  }
  popLogContext();
  return jobProgress;
}

export const getDataProcessingStatuses = async (cursor: undefined | Cursor): Promise<DataProcessingStatusesResult> => {
  pushLogContext(`getDataProcessingStatuses:`);
  const statuses: DataProcessingStatus[] = [];
  const queryLimit = 20; // (max allowed by the Forge storage API)
  const queryResult = await storage.query()
    .where('key', startsWith(storageKeyPrefix))
    .limit(queryLimit)
    .cursor(cursor)
    .getMany();
  for (const result of queryResult.results) {
    const status = result.value as DataProcessingStatus;
    statuses.push(status);
  }
  const nextCursor = queryResult.nextCursor;
  const result: DataProcessingStatusesResult = {
    statuses: statuses,
    cursor: nextCursor
  };
  popLogContext();
  return result;
}

export const deleteDataProcessingStatusById = async (dataProcessingId: string) => {
  pushLogContext(`deleteDataProcessingStatusById: ${dataProcessingId}`);
  const storageKey = buildDataProcessingStatusStorageKey(dataProcessingId);
  await storage.delete(storageKey);
  popLogContext();
}

export const clearAllJobStatuses = async () => {
  pushLogContext(`clearAllJobStatuses:`);
  const queryLimit = 20; // (max allowed by the Forge storage API)
  let allDeleted = false;
  let nextCursor = undefined;
  // It's unlikely there will be too many items to delete so we assume it can all be done quickly within 
  // a single invocation rather than having to defer this to a sequence of async events.
  while (!allDeleted) {
    const queryResult = await storage.query()
      .where('key', startsWith(storageKeyPrefix))
      .limit(queryLimit)
      .cursor(nextCursor)
      .getMany();
    for (const result of queryResult.results) {
      log(` * deleting key: ${result.key}`);
      await storage.delete(result.key);
    }
    nextCursor = queryResult.nextCursor;
    allDeleted = nextCursor === undefined;
  }
  log(`* Done`);
  popLogContext();
}
