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
    await refreshDataProcessingStatuses();
  }

  const onTriggerDataProcessing = async (response) => {
    console.log(`Status debugging: in onTriggerDataProcessing.`);
    const dataProcessingStartedResponseText = await invoke('startDataProcessing', {});
    const responseData = JSON.parse(dataProcessingStartedResponseText);
    setLastTriggerTime(new Date().getTime());
    const dataProcessingStartedFlag = showFlag({
      id: 'data-processing-started-flag',
      title: 'Data processing started',
      description: ``,
      type: 'info',
      isAutoDismiss: true,
    });
    setTimeout(dataProcessingStartedFlag.close, 2000);
    await refreshDataProcessingStatuses();
  }

  const refreshDataProcessingStatuses = async () => {
    const now = new Date().getTime();
    const millsSinceLastTrigger = now - lastTriggerTime;
    console.log(`Status debugging: millsSinceLastTrigger = ${millsSinceLastTrigger}ms.`);
    const inProgressCount = dataProcessingStatuses.filter((status) => status.status === 'IN_PROGRESS').length;
    const retrievalRequired = millsSinceLastTrigger < (2 * statusRefreshPeriodMillis) || inProgressCount > 0;
    console.log(`Status debugging: retrievalRequired = ${retrievalRequired}.`);
    if (retrievalRequired) {
      const cursor = undefined;
      const dataProcessingStatusesResult = await invoke('getDataProcessingStatuses', {cursor: cursor});
      console.log(`Status debugging: Setting ${dataProcessingStatusesResult.statuses.length} statuses (inProgressCount = ${inProgressCount})...`);
      setDataProcessingStatuses(dataProcessingStatusesResult.statuses);
    } else {
      console.log(`Status debugging: no status refresh required since all tasks have completed.`);
    }
  }

  useEffect(() => {
    if (lastTriggerTime === 0) {
      setLastTriggerTime(new Date().getTime());
    }
    console.log(`Status debugging: useEffect called`);
    const interval = setInterval(refreshDataProcessingStatuses, statusRefreshPeriodMillis);
    // Return an unmount function - clear interval to prevent memory leaks.
    return () => {
      console.log(`Status debugging: clearing interval`);
      clearInterval(interval)
    };
  }, [dataProcessingStatuses, lastTriggerTime]);

  useEffect(() => {
    refreshDataProcessingStatuses();
  }, []);

  const renderStartTime = (status) => {
    const message = `${new Date(status.dataProcessingStartTime).toLocaleTimeString()}`;
    return <Text>{message}</Text>
  }

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
    const progressBarValue = status.jobProgress.percentComplete ? status.jobProgress.percentComplete / 100.0 : 0;
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
    const head = {
      cells: [
        {
          key: "startTime",
          content: "Start time",
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
      key: `row-${status.dataProcessingId}`,
      cells: [
        {
          key: status.dataProcessingStartTime,
          content: renderStartTime(status),
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
        rowsPerPage={10}
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
          Cleanup data processing statuses
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
