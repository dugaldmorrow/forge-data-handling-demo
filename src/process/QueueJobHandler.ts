import { JobHandler } from "../types/JobHandler";
import { log, popLogContext, pushLogContext } from "./log";
import { computeJobProgress, updateDataProcessingStatus } from "./statusController";
import { InvocationError, InvocationErrorCode, PayloadTooBigError, Queue } from "@forge/events";
import { DataProcessingContext } from "src/types/DataProcessingContext";
import { initialRetryDelaySeconds, maxRetries } from "./config";
import { Job } from "../types/Job";
import { JobProcessingResult } from "src/types/JobProcessingResult";
import { RetryInfo } from "src/types/RetryInfo";

// https://developer.atlassian.com/platform/forge/runtime-reference/async-events-api/
const maxAllowedRetryAfter = 900;

export type QueueItemProcessor = {
  processJob: (job: Job<any>, event: any, context: DataProcessingContext, jobHandler: JobHandler) => Promise<JobProcessingResult>;
}

export class QueueJobHandler implements JobHandler {

  private jobQueue: Queue;
  private jobTypeIdsToQueueItemProcessors = new Map<string, QueueItemProcessor>();

  constructor(jobQueue: Queue) {
    this.jobQueue = jobQueue;
  }

  registerQueueItemProcessor = (jobTypeId: string, queueItemProcessor: QueueItemProcessor) => {
    this.jobTypeIdsToQueueItemProcessors.set(jobTypeId, queueItemProcessor);
  }

  processQueueItem = async (queueItem: any): Promise<void> => {
    const payload = queueItem.payload;
    const context = payload.context;
    log(` * Decrementing queue size from ${context.queueState.queueSize} to ${context.queueState.queueSize - 1}`)
    context.queueState.queueSize--;
    pushLogContext(`job-event-listener:`);
    log(` * ${JSON.stringify(payload.event)}`);
    const jobResult = await this.onProcessNextJob(payload);
    popLogContext();
    return jobResult;
  }

  private onProcessNextJob = async (payload: any): Promise<any> => {
    const event = payload.event;
    const context = payload.context as DataProcessingContext;

    pushLogContext('onProcessNextJob');
    const dataProcessingJobs = context.dataProcessingJobs;
    const nextJob = dataProcessingJobs.find((job: Job<any>) => job.status === undefined || job.status === 'IN_PROGRESS');
    if (nextJob) {
      log(` * Found the next job to process: ${nextJob.jobTypeId}`);
      if (payload.retryContext) {
        nextJob.jobContext.totalRetryCount += payload.retryContext.retryCount;
        log(` * this is a retry event, ${payload.retryContext.retryCount} retries so far`);
      } else {
        nextJob.jobContext.totalSuccessCount++;
      }
      nextJob.status = 'IN_PROGRESS';
      const queueItemProcessor = this.jobTypeIdsToQueueItemProcessors.get(nextJob.jobTypeId);
      if (queueItemProcessor) {
        const result = await queueItemProcessor.processJob(nextJob, event, context, this);
        if (result.ok) {
          this.enqueueJob(event, context);
        } else if (result.retryInfo) {
          log(` * Detected the failure of job "${nextJob.jobTypeId}".`);
          const retryCount = payload.retryContext ? payload.retryContext.retryCount : 0;
          if (retryCount < maxRetries) {
            const retryInfo: RetryInfo = result.retryInfo;
            const lastRetryDelaySeconds = payload.retryContext ? payload.retryContext.lastRetryDelaySeconds : initialRetryDelaySeconds;
            const retryAfter: number = Math.min(maxAllowedRetryAfter, retryInfo.retryAfter ? retryInfo.retryAfter : 2 * lastRetryDelaySeconds);
            log(` * Retrying job "${nextJob.jobTypeId}" after ${retryAfter} seconds...`);
            let retryReason = InvocationErrorCode.FUNCTION_RETRY_REQUEST;
            let retryData = undefined;
            popLogContext();
            return new InvocationError({
              retryAfter: retryAfter,
              retryReason: retryReason,
              retryData: retryData
            });  
          } else {
            const message = `Processing failed at job "${nextJob.jobTypeId}" - max retries exceeded (${retryCount}).`;
            log(` * ${message}`);
            await updateDataProcessingStatus(event.dataProcessingId, 'DONE_FAILED', computeJobProgress(context), message);
          }
        } else {
          const message = `Processing failed at job "${nextJob.jobTypeId}" - failed result and no retry info.`;
          log(` * ${message}`);
          await updateDataProcessingStatus(event.dataProcessingId, 'DONE_FAILED', computeJobProgress(context), message);
        }
      } else {
        console.error(` * Internal error: Unexpected job: ${nextJob.jobTypeId}`);
        await updateDataProcessingStatus(event.dataProcessingId, 'DONE_FAILED', computeJobProgress(context));
      }
    } else {
      log(` ****************************************************`);
      log(` *** All data processing jobs have been processed ***`);
      log(` ****************************************************`);
      await updateDataProcessingStatus(event.dataProcessingId, 'DONE_SUCCESS', computeJobProgress(context));
    }
    popLogContext();
  }

  enqueueJob = async (event: any, context: DataProcessingContext, delayInSeconds?: number) => {
    pushLogContext('processAsynchronously');
    try {
      // Clear the retry context
      context.retryContext = undefined;
      log(` * Incrementing queue size from ${context.queueState.queueSize} to ${context.queueState.queueSize + 1}`)
      context.queueState.queueSize++;
      const payload = {
        event: event,
        context: context as any
      }
      const pushSettings: any = delayInSeconds ? { delaySeconds: delayInSeconds } : undefined;
      /*const queueJobTypeId =*/ await this.jobQueue.push(payload, pushSettings);
      // const queueState = context.queueState;
      // queueState.jobsIdsToEnqueueTimes[queueJobTypeId] = new Date().getTime();
      await updateDataProcessingStatus(event.dataProcessingId, 'IN_PROGRESS', computeJobProgress(context));
    } catch (error) {
      if (error instanceof PayloadTooBigError) {
        console.error(`Detected PayloadTooBigError: ${error}`);
      } else {
        // Note that it should not be possible to get a RateLimitError here since we are sequentially 
        // creating async tasks.
        console.error(`Unexpected error detected: ${error}`);
      }
      await updateDataProcessingStatus(event.dataProcessingId, 'DONE_FAILED', computeJobProgress(context));
    }
    popLogContext();
  }

}