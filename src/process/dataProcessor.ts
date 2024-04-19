import { computeJobProgress, getDataProcessingStatus, updateDataProcessingStatus } from './statusController';
import { Queue } from '@forge/events';
import Resolver from "@forge/resolver";
import { Job } from '../types/Job';
import { popLogContext, pushLogContext, log } from './log';
import { DataProcessingContext } from '../types/DataProcessingContext';
import { QueueItemProcessor, QueueJobHandler } from './QueueJobHandler';
import { initialSpaceJobConfig, onProcessSpaces } from './spaceProcessor';
import { initialUserJobConfig, onProcessUsers } from './userProcessor';
import { JobHandler } from 'src/types/JobHandler';
import { JobProcessingResult } from 'src/types/JobProcessingResult';

/*
Sequence of events (paste into https://www.websequencediagrams.com/)

title Data processing sequence
DataProcessingController->onStartDataProcessing: trigger
note right of onFileUploaded: Do all processing after this in\nasync tasks in sequential order
onFileUploaded->asyncTask: enqueue onAsyncFileUploaded
asyncTask-> asyncTask: enqueue initial data processing tasks
asyncTask-> asyncTask: query confluence spaces
asyncTask-> asyncTask: enqueue confluence space item tasks
asyncTask-> asyncTask: process space item tasks
asyncTask-> asyncTask: query confluence spaces (next cursor)
asyncTask-> asyncTask: enqueue confluence space item tasks
asyncTask-> asyncTask: process space item tasks
asyncTask-> asyncTask: query confluence spaces (next cursor)
asyncTask-> asyncTask: enqueue confluence space item tasks
asyncTask-> asyncTask: process space item tasks
asyncTask-> asyncTask: query users
asyncTask-> asyncTask: etc

*/


const spaceQueueItemProcessor: QueueItemProcessor = {
  processJob: async (job: Job<any>, event: any, context: DataProcessingContext, jobHandler: JobHandler): Promise<JobProcessingResult> => {
    return await onProcessSpaces(job, event, context, jobHandler);
  }
}

const userQueueItemProcessor: QueueItemProcessor = {
  processJob: async (job: Job<any>, event: any, context: DataProcessingContext, jobHandler: JobHandler): Promise<JobProcessingResult> => {
    return await onProcessUsers(job, event, context, jobHandler);
  }
}

export const jobQueue = new Queue({ key: 'jobQueue' });
const jobHandler = new QueueJobHandler(jobQueue);
jobHandler.registerQueueItemProcessor('process-confluence-spaces', spaceQueueItemProcessor);
jobHandler.registerQueueItemProcessor('process-users', userQueueItemProcessor);

const asyncResolver = new Resolver();
asyncResolver.define("job-event-listener", jobHandler.processQueueItem);

export const onAsyncJob = asyncResolver.getDefinitions();

export const onStartDataProcessing = async (event: any, context: DataProcessingContext) => {
  pushLogContext('onStartDataProcessing');
  const initialJobConfig: Job<any>[] = [
    initialSpaceJobConfig,
    initialUserJobConfig
  ]
  context.dataProcessingJobs = initialJobConfig;
  jobHandler.enqueueJob(event, context);
  popLogContext();
}
