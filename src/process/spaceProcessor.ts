import { log, popLogContext, pushLogContext } from "./log";
import { asApp } from "../mock-api/mockApi";
import { DataProcessingContext } from "../types/DataProcessingContext";
import { Job } from "../types/Job";
import { JobHandler } from "src/types/JobHandler";
import { JobProcessingResult } from "src/types/JobProcessingResult";

// This type can be customised to include any context required for the job.
// An object of this type will be passed serially from one async task to the
// next so make sure it doesn't grow indefinitely in size. 
export type SpaceJobContext = {
  nextSpacesCursor: undefined | string;
  spaceItemsToProcess: any[];
  totalSuccessCount: number;
  totalRetryCount: number;
}

export const initialSpaceJobConfig: Job<SpaceJobContext> = {
  jobTypeId: 'process-confluence-spaces',
  status: undefined,
  jobContext: {
    nextSpacesCursor: undefined,
    spaceItemsToProcess: [],
    totalSuccessCount: 0,
    totalRetryCount: 0
  }
}

export const onProcessSpaces = async (
    job: Job<SpaceJobContext>,
    event: any, context: DataProcessingContext,
    jobHandler: JobHandler): Promise<JobProcessingResult> => {
  pushLogContext('onProcessSpaces');
  log(` * job.jobContext.nextSpacesCursor = ${job.jobContext.nextSpacesCursor}`);
  const jobProcessingResult: JobProcessingResult = {
    ok: false
  }
  // Process space items before getting more sopaces so that we keep the number of yet to
  // be proecessed items to a minimum, otherwise there will be too many items in the context
  // passed between async tasks.
  if (job.jobContext.spaceItemsToProcess.length) {
    // This constant can be changed depending on how long it will take to process each item.
    const maxSpaceItemsToProcessPerAsyncTask = 2;
    let itemsProcessed = 0;
    while (itemsProcessed < maxSpaceItemsToProcessPerAsyncTask && job.jobContext.spaceItemsToProcess.length) {
      const spaceItem = job.jobContext.spaceItemsToProcess.shift();
      log(` * processing confluence space item: ${spaceItem.key}: ${spaceItem.value}`);
      itemsProcessed++;
    }
    jobProcessingResult.ok = true;
  } else {
    // This constant can be changed depending on how long it will take to process each item.
    const maxSpacesToQueryPerAsyncTask = 2;
    const nextCursor = job.jobContext.nextSpacesCursor;
    const queryResponse = await asApp().query().entityType('space').pageSize(maxSpacesToQueryPerAsyncTask).cursor(nextCursor).getMany();
    if (queryResponse.ok) {
      const queryResult = await queryResponse.getData();
      job.jobContext.nextSpacesCursor = queryResult.nextCursor;
      for (const space of queryResult.items) {
        log(` * Adding space "${space.key}" to the job queue...`);
        job.jobContext.spaceItemsToProcess.push(space);
      }
      if (queryResult.nextCursor) {
        log(` * Adding space query cursor "${queryResult.nextCursor}" to the job queue...`);
        job.jobContext.nextSpacesCursor = queryResult.nextCursor;
      } else {
        log(` * No more space queries are required.`);
        job.status = 'DONE_SUCCESS';
      }
      // job.jobContext.totalSuccessCount++;
      jobProcessingResult.ok = true;
    } else {
      jobProcessingResult.ok = false;
      jobProcessingResult.retryInfo = {
        retryAfter: queryResponse.retryAfter ?? undefined
      }
    }
  }
  popLogContext();
  return jobProcessingResult;
}

