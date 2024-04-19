import { JobHandler } from "../types/JobHandler";
import { log, popLogContext, pushLogContext } from "./log";
import { computeJobProgress, updateDataProcessingStatus } from "./statusController";
import { InvocationError, InvocationErrorCode, PayloadTooBigError, Queue } from "@forge/events";
import { DataProcessingContext } from "src/types/DataProcessingContext";
import { initialRetryDelaySeconds, maxRetries } from "./config";
import { Job } from "../types/Job";
import { RetryInfo } from "src/types/RetryInfo";
import { TaskStatus } from '../types/TaskStatus';
import { JobProcessor } from "src/types/JobProcessor";

// https://developer.atlassian.com/platform/forge/runtime-reference/async-events-api/
const maxAllowedRetryAfter = 900;
const maxAllowedAsyncEventRetries = 4;

export class SequnetialJobHandler implements JobHandler {

  private jobQueue: Queue;
  private jobTypeIdsToJobProcessors = new Map<string, JobProcessor>();

  constructor(jobQueue: Queue) {
    this.jobQueue = jobQueue;
  }

  registerJobProcessor = (jobTypeId: string, jobProcessor: JobProcessor) => {
    this.jobTypeIdsToJobProcessors.set(jobTypeId, jobProcessor);
  }

  processQueueItem = async (queueItem: any): Promise<any> => {
    pushLogContext('onProcessNextJob');
    const payload = queueItem.payload;
    const event = payload.event;
    const context = payload.context as DataProcessingContext;
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
      const jobProcessor = this.jobTypeIdsToJobProcessors.get(nextJob.jobTypeId);
      if (jobProcessor) {
        const result = await jobProcessor.processJob(nextJob);
        if (result.ok) {
          this.enqueueJob(event, context);
        } else if (result.retryInfo) {
          log(` * Detected the failure of job "${nextJob.jobTypeId}".`);
          const retryCount = payload.retryContext ? payload.retryContext.retryCount : 0;
          if (retryCount < Math.min(maxAllowedAsyncEventRetries, maxRetries)) {
            const retryInfo: RetryInfo = result.retryInfo;
            const retryAfter = retryInfo.retryAfter ? retryInfo.retryAfter : this.computeRetryBackoff(retryCount);
            log(` * Retrying job "${nextJob.jobTypeId}" after ${retryAfter} seconds...`);
            const retryReason = InvocationErrorCode.FUNCTION_RETRY_REQUEST;
            const retryData = undefined;
            popLogContext();
            return new InvocationError({
              retryAfter: retryAfter,
              retryReason: retryReason,
              retryData: retryData
            });  
          } else {
            const message = `Processing failed at job "${nextJob.jobTypeId}" - max retries exceeded (${retryCount}).`;
            log(` * ${message}`);
            await this.updateStatus(event, context, 'DONE_FAILED', message);
          }
        } else {
          const message = `Processing failed at job "${nextJob.jobTypeId}" - failed result and no retry info.`;
          log(` * ${message}`);
          await this.updateStatus(event, context, 'DONE_FAILED', message);
        }
      } else {
        const message = `Internal error: Unexpected job: ${nextJob.jobTypeId}.`;
        console.error(` * ${message}`);
        await this.updateStatus(event, context, 'DONE_FAILED', message);
      }
    } else {
      log(` ****************************************************`);
      log(` *** All data processing jobs have been processed ***`);
      log(` ****************************************************`);
      await this.updateStatus(event, context, 'DONE_SUCCESS');
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
      await this.jobQueue.push(payload, pushSettings);
      await this.updateStatus(event, context, 'IN_PROGRESS');
    } catch (error) {
      if (error instanceof PayloadTooBigError) {
        const message = `Detected PayloadTooBigError: ${error}`;
        console.error(message);
        this.updateStatus(event, context, 'DONE_FAILED', message);
      } else {
        // Note that it should not be possible to get a RateLimitError here since we are sequentially 
        // creating async tasks.
        console.error(`Unexpected error detected: ${error}`);
      }
      await this.updateStatus(event, context, 'DONE_FAILED');
    }
    popLogContext();
  }

  private updateStatus = async (event: any, context: DataProcessingContext, status: TaskStatus, message?: string): Promise<void> => {
    await updateDataProcessingStatus(event.dataProcessingId, event.dataProcessingStartTime, status, computeJobProgress(context), message);
  }

  private computeRetryBackoff = (retryCount: number): number => {
    let retryAfter = initialRetryDelaySeconds;
    // Exponential retry backoff
    for (let i = 0; i < retryCount; i++) {
      retryAfter = Math.min(retryAfter * 2, maxAllowedRetryAfter);
      if (retryAfter >= maxAllowedRetryAfter) {
        break;
      }
    }
    return retryAfter;
  }

}