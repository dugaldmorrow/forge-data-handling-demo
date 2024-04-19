import { Cursor } from "../types/Cursor";
import { ApiResponse } from "./ApiResponse";
import { QueryResults } from "./QueryResults";
import { EntityType } from "./mockApi";
import { Entity } from "./Entity";

export interface EntityQuery {
  entityType: (entityType: EntityType) => EntityQuery;
  pageSize: (pageSize: number) => EntityQuery;
  cursor: (cursor: undefined | Cursor) => EntityQuery;
  getMany: () => Promise<ApiResponse<QueryResults<Entity>>>;
}
