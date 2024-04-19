import React, { useEffect, useState } from 'react';
import ForgeReconciler, {
  Box,
  Button,
  DynamicTable,
  Heading,
  Inline,
  ProgressBar,
  Stack,
  Text
} from '@forge/react';
import { invoke, showFlag } from '@forge/bridge';

const statusRefreshPeriodMillis = 5000;

const JobManagerUI = () => {

  const [dataProcessingId, setDataProcessingId] = useState('');
  const [dataProcessingStatus, setDataProcessingStatus] = useState(undefined);
  const [dataProcessingStatuses, setDataProcessingStatuses] = useState([]);
  const [lastTriggerTime, setLastTriggerTime] = useState(0);

  const onCleanupAllJobStatusStorage = async () => {
    await invoke('cleanupAllJobStatusStorage', {});
    setDataProcessingStatuses([]);
  }

  const onDeleteStatus = async (status) => {
    await invoke('deleteDataProcessingStatusById', {dataProcessingId: status.dataProcessingId});
    const allStatuses = dataProcessingStatuses.filter((s) => s.dataProcessingId !== status.dataProcessingId);
    setDataProcessingStatuses(allStatuses);
    setDataProcessingStatus(undefined);
    setDataProcessingId('');
  }

  const onTriggerDataProcessing = async (response) => {
    console.log(`Status debugging: in onTriggerDataProcessing.`);
    setDataProcessingStatus('IN_PROGRESS');
    const dataProcessingStartedResponseText = await invoke('startDataProcessing', {});
    const responseData = JSON.parse(dataProcessingStartedResponseText);
    const dataProcessingId = responseData.dataProcessingId;
    setDataProcessingId(dataProcessingId);
    // setTriggerCount(triggerCount + 1);
    console.log(`Status debugging: updating last trigger time...`);
    setLastTriggerTime(new Date().getTime());

    // if (typeof setTriggerCount === 'function') {
    //   setTriggerCount(triggerCount + 1);
    // } else {
    //   console.log(`Status debugging: setTriggerCount is not a function.`);
    // }

    // const status = {
    //   dataProcessingId: dataProcessingId,
    //   status: 'IN_PROGRESS',
    //   jobProgress: {
    //     jobCount: 0,
    //     jobCompletionCount: 0,
    //     percentComplete: 0,
    //     queueSize: 0
    //   },
    //   message: ''
    // }
    // const allStatuses = dataProcessingStatuses.concat([status]);
    // console.log(`onTriggerDataProcessing: setting allStatuses: ${JSON.stringify(allStatuses, null, 2)}`);
    // setDataProcessingStatuses(allStatuses);

    const dataProcessingStartedFlag = showFlag({
      id: 'data-processing-started-flag',
      title: 'Data processing started',
      description: `dataProcessingId: ${dataProcessingId}`,
      type: 'info',
      isAutoDismiss: true,
    });
    setTimeout(dataProcessingStartedFlag.close, 2000);

    // await refreshDataProcessingStatuses(true, undefined, dataProcessingStatuses, [], setDataProcessingStatuses);

    // if (!dataProcessingStatusInterval) {
    //   const interval = setInterval(() => {
    //     pollDataProcessingStatus(dataProcessingId, allStatuses, setDataProcessingStatuses);
    //   }, statusRefreshPeriodMillis);
    //   setDataProcessingStatusInterval(interval);
    // }
  }

  const countIncompleteDataProcessingStatuses = (dataProcessingStatuses) => {
    return dataProcessingStatuses.filter((status) => status === 'IN_PROGRESS').length;
  }

  const refreshDataProcessingStatuses = async () => {
    const now = new Date().getTime();
    const millsSinceLastTrigger = now - lastTriggerTime;
    console.log(`Status debugging: millsSinceLastTrigger = ${millsSinceLastTrigger}ms.`);
    const inProgressCount = countIncompleteDataProcessingStatuses(dataProcessingStatuses);
    // const retrievalRequired = millsSinceLastTrigger < statusRefreshPeriodMillis || inProgressCount > 0;
    const retrievalRequired = true;
    if (retrievalRequired) {
      const cursor = undefined;
      const dataProcessingStatusesResult = await invoke('getDataProcessingStatuses', {cursor: cursor});
      console.log(`Status debugging: Setting ${dataProcessingStatusesResult.statuses.length} statuses...`);
      setDataProcessingStatuses(dataProcessingStatusesResult.statuses);
    } else {
      console.log(`Status debugging: no status refresh required since all tasks have completed.`);
    }
  }

  useEffect(async () => {
    console.log(`Status debugging: useEffect called`);
    const interval = setInterval(refreshDataProcessingStatuses, statusRefreshPeriodMillis);
    // Return an unmount function - clear interval to prevent memory leaks.
    return () => {
      console.log(`Status debugging: clearing interval`);
      clearInterval(interval)
    };
  // }, [dataProcessingStatuses, lastTriggerTime]);
  }, []);
  // }, [lastTriggerTime]);


  // if (setDataProcessingStatuses) {
  //   if (typeof setDataProcessingStatuses === 'function') {
  //     setDataProcessingStatuses(dataProcessingStatusesResult.statuses);
  //   } else {
  //     console.log(`Status debugging: setDataProcessingStatuses is not a function.`);
  //   }  
  // } else {
  //   console.log(`Status debugging: setDataProcessingStatuses does not exist.`);
  // }


  // --------

  // Requirements:
  //  * Need 

  // const [statuses, setStatuses] = useState([]);
  // const [triggerCount, setTriggerCount] = useState(0);
  
  // const onTriggerProcessing = async (response) => {
  //   await invoke('startProcessing', {});
  //   setTriggerCount(triggerCount + 1);
  // }

  // const refreshStatusesFromBackend = async () => {
  //   const inProgressCount = statuses.filter((status) => status === 'IN_PROGRESS').length;
  //   const refreshRequired = inProgressCount > 0;
  //   if (refreshRequired) {
  //     const statuses = await invoke('getStatuses', {cursor: cursor});
  //     setStatuses(statuses);
  //   }
  // }

  // useEffect(async () => {
  //   const interval = setInterval(refreshStatusesFromBackend, statusRefreshPeriodMillis);
  //   // Return an unmount function - clear interval to prevent memory leaks.
  //   return () => clearInterval(interval);
  // }, [triggerCount, statuses]);

  // --------



  // const refreshDataProcessingStatuses = async (
  //     force, cursor, dataProcessingStatuses, accumulatedDataProcessingStatuses, setDataProcessingStatuses) => {
  //   const inProgressCount = countIncompleteDataProcessingStatuses(dataProcessingStatuses);
  //   const retrievalRequired = force || inProgressCount > 0;
  //   // const retrievalRequired = false;
  //   if (retrievalRequired) {
  //     const dataProcessingStatusesResult = await invoke('getDataProcessingStatuses', {cursor: cursor});
  //     if (dataProcessingStatusesResult.statuses && dataProcessingStatusesResult.statuses.length ) {
  //       accumulatedDataProcessingStatuses = accumulatedDataProcessingStatuses.concat(dataProcessingStatusesResult.statuses);
  //     }
  //     if (dataProcessingStatusesResult.cursor) {
  //       const additionalDataProcessingStatuses = await refreshDataProcessingStatuses(
  //         true, dataProcessingStatusesResult.cursor, dataProcessingStatuses, accumulatedDataProcessingStatuses, setDataProcessingStatuses);
  //       if (additionalDataProcessingStatuses.statuses && additionalDataProcessingStatuses.statuses.length ) {
  //         accumulatedDataProcessingStatuses = accumulatedDataProcessingStatuses.concat(additionalDataProcessingStatuses);
  //       }
  //     } else {
  //       // console.log(`Setting data processing statuses to ${JSON.stringify(refreshedDataProcessingStatuses, null, 2)}`);
  //       // console.log(`${logPrefx} setting data processing statuses (length = ${accumulatedDataProcessingStatuses})...`);
  //       setDataProcessingStatuses(accumulatedDataProcessingStatuses);
  //     }
  //   }
  //   return accumulatedDataProcessingStatuses;
  // }

  // useEffect(async () => {
  //   const cursor = undefined;
  //   // let refreshedDataProcessingStatuses = dataProcessingStatuses;
  //   let refreshedDataProcessingStatuses = await refreshDataProcessingStatuses(true, cursor, dataProcessingStatuses, [], setDataProcessingStatuses);
  //   const interval = setInterval(async () => {
  //     refreshedDataProcessingStatuses = await refreshDataProcessingStatuses(true, cursor, refreshedDataProcessingStatuses, [], setDataProcessingStatuses);
  //   }, statusRefreshPeriodMillis);
  //   // Return an unmount function - clear interval to prevent memory leaks.
  //   return () => clearInterval(interval);
  // }, []);

  const renderQueueSize = (status) => {
    const message = `${status.jobProgress.queueSize}`;
    return <Text>{message}</Text>
  }

  const renderJobHistory = (status) => {
    return (
      <Stack>
        <Text>{`Successes: ${status.jobProgress.totalSuccessCount}`}</Text>
        <Text>{`Retries: ${status.jobProgress.totalRetryCount}`}</Text>
      </Stack>
    );
  }

  const renderJobProgress = (status) => {
    const progressBarValue = status.jobProgress.percentComplete ? status.jobProgress.percentComplete / 100.0 : 0;
    const appearance = 'success';
    const jobProgressMesasge = `${status.jobProgress.jobCompletionCount} of ${status.jobProgress.jobCount}`;
    return (
      <Stack>
        <Text>{jobProgressMesasge}</Text>
        <ProgressBar
          value={progressBarValue}
          appearance={appearance}
          isIndeterminate={false}
        />
      </Stack>
    );
  }

  const renderDataProcessingStatusCell = (status) => {
    // console.log(`renderStatusCell: rendering status: ${JSON.stringify(status, null, 2)}`);
    const progressBarValue = status.jobProgress.percentComplete ? status.jobProgress.percentComplete / 100.0 : 0;
    // console.log(`renderStatusCell: progressBarValue = ${progressBarValue}`);
    const appearance = 'success';
    return (
      <Stack>
        <Text>{status.status}</Text>
        <ProgressBar
          value={progressBarValue}
          appearance={appearance}
          isIndeterminate={status.status === 'IN_PROGRESS'}
        />
      </Stack>
    );
  }

  const renderStatusesTable = (dataProcessingStatuses) => {
    // console.log(`renderStatusesTable: rendering ${dataProcessingStatuses.length} statuses`);
    const head = {
      cells: [
        {
          key: "id",
          content: "ID",
          isSortable: true,
        }, {
          key: "queueSize",
          content: "Queue size",
          isSortable: false,
        }, {
          key: "jobHistory",
          content: "Job history",
          isSortable: false,
        }, {
          key: "jobProgress",
          content: "Job progress",
          isSortable: false,
        }, {
          key: "status",
          content: "Status",
          isSortable: true,
        }, {
          key: "operations",
          content: "Operations",
          isSortable: true,
        },
      ],
    };
    const rows = dataProcessingStatuses.map((status, index) => ({
      key: `row-${dataProcessingId}`,
      cells: [
        {
          key: status.dataProcessingId,
          content: status.dataProcessingId,
        }, {
          content: renderQueueSize(status),
        }, {
          content: renderJobHistory(status),
        }, {
          content: renderJobProgress(status),
        }, {
          key: status.status,
          content: renderDataProcessingStatusCell(status),
        }, {
          key: status.operations,
          content: (
            <Button
              appearance="default"
              onClick={() => onDeleteStatus(status)}
            >
              Delete
            </Button>
          ),
        },
      ],
    }));
    return (
      <DynamicTable
        rowsPerPage={4}
        head={head}
        rows={rows}
      />
    )
  }

  return (
    <Box padding='space.400' backgroundColor='color.background.discovery'>
      <Heading as="h3">Data Processing Manager</Heading>
      <Inline space="space.100" shouldWrap={true} rowSpace="space.100">
        <Button
          appearance="primary"
          onClick={onTriggerDataProcessing}
        >
          Trigger data processing processing
        </Button>
        <Button
          appearance="default"
          onClick={onCleanupAllJobStatusStorage}
        >
          Cleanup previous data processing status
        </Button>
      </Inline>
      {dataProcessingStatuses.length ? renderStatusesTable(dataProcessingStatuses) : null}
    </Box>
  );

};

ForgeReconciler.render(
  <React.StrictMode>
    <JobManagerUI />
  </React.StrictMode>
);
