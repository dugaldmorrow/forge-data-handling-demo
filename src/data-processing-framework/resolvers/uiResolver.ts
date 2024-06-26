import Resolver from '@forge/resolver';
import { getDataProcessingStatus, clearAllJobStatuses, getDataProcessingStatuses, deleteDataProcessingStatusById } from '../process/statusController';
import { Cursor } from '../../data-processing-framework/types/Cursor';
import { DataProcessingContext } from '../../data-processing-framework/types/DataProcessingContext';
import {
  createEventFromMacroStartDataProcessingTrigger,
  onStartDataProcessing
} from '../..';

const resolver = new Resolver();

resolver.define('startDataProcessing', async (request) => {
  // console.log(request);
  const event = await createEventFromMacroStartDataProcessingTrigger();

  // Add some data to the event so for the macro UI
  const dataProcessingStartTime = new Date().getTime();
  const dataProcessingId = `data-processing-${dataProcessingStartTime}`;
  event.dataProcessingId = dataProcessingId;
  event.dataProcessingStartTime = dataProcessingStartTime;

  const context: DataProcessingContext = {
    dataProcessingJobs: [],
    queueState: {
      queueSize: 0,
    },
  };
  try {
    await onStartDataProcessing(event, context);
    return JSON.stringify({dataProcessingId: dataProcessingId});
  } catch (error) {
    console.error(error);
    return error;
  }
});

resolver.define('getDataProcessingStatus', async (request) => {
  // console.log(request);
  const dataProcessingId = request.payload.dataProcessingId;
  try {
    const migrationStatus = await getDataProcessingStatus(dataProcessingId) ?? {};
    // console.log(` * returning job status for ${dataProcessingId}: ${JSON.stringify(migrationStatus)}`);
    return JSON.stringify(migrationStatus);
  } catch (error) {
    console.error(error);
    return error;
  }
});

resolver.define('getDataProcessingStatuses', async (request) => {
  // console.log(request);
  try {
    const cursor: undefined | Cursor = request.payload.cursor;
    return await getDataProcessingStatuses(cursor);
  } catch (error) {
    console.error(error);
    return error;
  }
});

resolver.define('deleteDataProcessingStatusById', async (request) => {
  // console.log(request);
  try {
    const dataProcessingId = request.payload.dataProcessingId;
    await deleteDataProcessingStatusById(dataProcessingId);
    // console.log(`Data processing status: ${JSON.stringify(migrationStatus)}`);
    return '{}';
  } catch (error) {
    console.error(error);
    return error;
  }
});

resolver.define('cleanupAllJobStatusStorage', async (request) => {
  // console.log(request);
  try {
    await clearAllJobStatuses();
    // console.log(`Data processing status: ${JSON.stringify(migrationStatus)}`);
    return '{}';
  } catch (error) {
    console.error(error);
    return error;
  }
});

export const onMacroEvent = resolver.getDefinitions();
