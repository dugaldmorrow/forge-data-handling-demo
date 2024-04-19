import { Queue } from '@forge/events';
import Resolver from "@forge/resolver";
import { Job } from '../types/Job';
import { popLogContext, pushLogContext, log } from './log';
import { DataProcessingContext } from '../types/DataProcessingContext';
import { SequnetialJobHandler } from './SequnetialJobHandler';
import { initialSpaceJobConfig, onProcessSpaces } from './spaceProcessor';
import { initialUserJobConfig, onProcessUsers } from './userProcessor';
import { JobProcessingResult } from 'src/types/JobProcessingResult';
import { JobProcessor } from 'src/types/JobProcessor';

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

const spaceJobProcessor: JobProcessor = {
  processJob: async (job: Job<any>): Promise<JobProcessingResult> => {
    return await onProcessSpaces(job);
  }
}

const userJobProcessor: JobProcessor = {
  processJob: async (job: Job<any>): Promise<JobProcessingResult> => {
    return await onProcessUsers(job);
  }
}

export const jobQueue = new Queue({ key: 'jobQueue' });
const jobHandler = new SequnetialJobHandler(jobQueue);
jobHandler.registerJobProcessor('process-spaces', spaceJobProcessor);
jobHandler.registerJobProcessor('process-users', userJobProcessor);

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
