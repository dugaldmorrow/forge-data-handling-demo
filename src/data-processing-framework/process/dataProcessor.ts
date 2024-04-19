import { Queue } from '@forge/events';
import Resolver from "@forge/resolver";
import { Job } from '../types/Job';
import { popLogContext, pushLogContext, log } from './log';
import { DataProcessingContext } from '../types/DataProcessingContext';
import { SequnetialJobHandler } from './SequnetialJobHandler';
import { initialSpaceJobConfig } from '../../data-processing/spaceProcessor';
import { initialUserJobConfig } from '../../data-processing/userProcessor';
import { registerJobProcessors } from '../../data-processing/registerJobProcessors';

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

export const jobQueue = new Queue({ key: 'jobQueue' });
const jobHandler = new SequnetialJobHandler(jobQueue);
registerJobProcessors(jobHandler);

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
