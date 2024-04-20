import { log, popLogContext, pushLogContext } from "../data-processing-framework/process/log";
import { asApp } from "../data-processing-framework/mock-api/mockApi";
import { Job } from "../data-processing-framework/types/Job";
import { JobProcessingResult } from "src/data-processing-framework/types/JobProcessingResult";
import { JobProcessor } from "src/data-processing-framework/types/JobProcessor";

// This type can be customised to include any context required for the job.
// An object of this type will be passed serially from one async task to the
// next so make sure it doesn't grow indefinitely in size. 
export type UserJobContext = {
  nextUsersCursor: undefined | string;
  userItemsToProcess: any[];
  totalSuccessCount: number;
  totalRetryCount: number;
}

export const initialUserJobConfig: Job<UserJobContext> = {
  jobTypeId: 'process-users',
  status: undefined,
  jobContext: {
    nextUsersCursor: undefined,
    userItemsToProcess: [],
    totalSuccessCount: 0,
    totalRetryCount: 0
  }
}

export const userJobProcessor: JobProcessor = {
  getJobTypeId: () => 'process-users',
  processJob: async (event: any, job: Job<any>): Promise<JobProcessingResult> => {
    return await onProcessUsers(event, job);
  }
}

export const onProcessUsers = async (event: any, job: Job<UserJobContext>): Promise<JobProcessingResult> => {
  pushLogContext('onProcessUsers');
  log(` * job.jobContext.nextUsersCursor = ${job.jobContext.nextUsersCursor}`);
  const jobProcessingResult: JobProcessingResult = {
    ok: false
  }
  // Process user items before getting more sopaces so that we keep the number of yet to
  // be proecessed items to a minimum, otherwise there will be too many items in the context
  // passed between async tasks.
  if (job.jobContext.userItemsToProcess.length) {
    // This constant can be changed depending on how long it will take to process each item.
    const maxUserItemsToProcessPerAsyncTask = 2;
    let itemsProcessed = 0;
    while (itemsProcessed < maxUserItemsToProcessPerAsyncTask && job.jobContext.userItemsToProcess.length) {
      const userItem = job.jobContext.userItemsToProcess.shift();
      log(` * processing user item: ${userItem.key}: ${userItem.value}`);
      itemsProcessed++;
    }
    jobProcessingResult.ok = true;
  } else {
    // This constant can be changed depending on how long it will take to process each item.
    const maxUsersToQueryPerAsyncTask = 2;
    const nextCursor = job.jobContext.nextUsersCursor;
    const queryResponse = await asApp().query().entityType('user').pageSize(maxUsersToQueryPerAsyncTask).cursor(nextCursor).getMany();
    if (queryResponse.ok) {
      const queryResult = await queryResponse.getData();
      job.jobContext.nextUsersCursor = queryResult.nextCursor;
      for (const user of queryResult.items) {
        log(` * Adding user "${user.key}" to the job queue...`);
        job.jobContext.userItemsToProcess.push(user);
      }
      if (queryResult.nextCursor) {
        log(` * Adding user query cursor "${queryResult.nextCursor}" to the job queue...`);
        job.jobContext.nextUsersCursor = queryResult.nextCursor;
      } else {
        log(` * No more user queries are required.`);
        job.status = 'DONE_SUCCESS';
      }
      // job.jobContext.totalSuccessCount++;
      jobProcessingResult.ok = true;
    } else {
      // The retry count has to be incremented within the job handler in order for it to be 
      // passed to the next async task.
      // job.jobContext.totalRetryCount++;
      jobProcessingResult.ok = false;
      jobProcessingResult.retryInfo = {
        retryAfter: queryResponse.retryAfter ?? undefined
      }
    }
  }
  popLogContext();
  return jobProcessingResult;
}
