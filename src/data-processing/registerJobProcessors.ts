import { userJobProcessor } from "./userProcessor";
import { spaceJobProcessor } from "./spaceProcessor";
import { JobHandler } from "src/data-processing-framework/types/JobHandler";

export const registerJobProcessors = (jobHandler: JobHandler) => {
  jobHandler.registerJobProcessor(spaceJobProcessor);
  jobHandler.registerJobProcessor(userJobProcessor);  
}