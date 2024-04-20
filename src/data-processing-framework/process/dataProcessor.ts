import { Queue } from '@forge/events';
import Resolver from "@forge/resolver";
import { SequnetialJobHandler } from './SequnetialJobHandler';

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
export const jobHandler = new SequnetialJobHandler(jobQueue);

const asyncResolver = new Resolver();
asyncResolver.define("job-event-listener", jobHandler.processQueueItem);

export const onDataProcessorAsyncJob = asyncResolver.getDefinitions();

export const getJobHandler = () => {
  return jobHandler;
}
