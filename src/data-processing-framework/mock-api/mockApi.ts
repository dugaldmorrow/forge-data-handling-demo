import { Cursor } from "src/data-processing-framework/types/Cursor";
import { QueryResults } from "./QueryResults";
import { Entity } from "./Entity";
import { ApiResponse } from "./ApiResponse";
import { EntityQuery } from "./EntityQuery";
import { errorProbability } from "./apiConfig";

export type EntityType = 'space' | 'user';

export interface AsApp {
  query: () => EntityQuery;
}

type EntityDataModel = {
  itemCount: number;
  keyPrefix: string;
  valuePrefix: string;
}

const spaceDataModel: EntityDataModel = {
  itemCount: 5,
  keyPrefix: 'SPACE-',
  valuePrefix: 'Space ',
}

const userDataModel: EntityDataModel = {
  itemCount: 5,
  keyPrefix: 'USER-',
  valuePrefix: 'User ',
}

const dataModel = new Map<EntityType, EntityDataModel>(
  [
    ['space', spaceDataModel],
    ['user', userDataModel]
  ]
);

export const asApp = (): AsApp => {
  return new AsAppImpl();
}

class AsAppImpl implements AsApp {
  query = (): EntityQuery => {
    return new EntityQueryImpl() as EntityQuery;
  }
}

class EntityQueryImpl implements EntityQuery {

  private _entityType: EntityType = 'space';
  private _pageSize: number = 2;
  private _cursor: undefined | Cursor = undefined;

  entityType = (entityType: EntityType): EntityQuery => {
    this._entityType = entityType;
    return this;
  }

  pageSize = (pageSize: number): EntityQuery => {
    this._pageSize = pageSize;
    return this;
  }

  cursor = (cursor: undefined | Cursor): EntityQueryImpl => {
    this._cursor = cursor;
    return this;
  }

  getMany = async (): Promise<ApiResponse<QueryResults<Entity>>> => {
    const createError = Math.random() < errorProbability;
    if (createError) {
      const data = undefined;
      return new ApiResponseImpl<QueryResults<Entity>>(false, 429, data);
    } else {
      const data: QueryResults<Entity> = await retrieveEntities(this._entityType, this._pageSize, this._cursor);
      return new ApiResponseImpl<QueryResults<Entity>>(true, 200, data);
    }
  }
}

const retrieveEntities = async (entityType: EntityType, pageSize: number, cursor: undefined | Cursor): Promise<QueryResults<Entity>> => {
  const results: QueryResults<Entity> = {
    items: [],
    nextCursor: undefined
  };
  const entityDataModel: EntityDataModel = dataModel.get(entityType)!;
  const offset = cursor ? parseInt(cursor.replace('offset-', '')) : 0;
  const itemRetrievalCount = Math.max(Math.min(entityDataModel.itemCount - offset, pageSize), 0);
  for (let i = 0; i < itemRetrievalCount; i++) {
    const key = `${entityDataModel.keyPrefix}${offset + i}`;
    const value = `${entityDataModel.valuePrefix}${offset + i}`;
    const entity: Entity = { key, value };
    results.items.push(entity);
  }
  const indexOfLastItem = offset + itemRetrievalCount;
  results.nextCursor = indexOfLastItem < entityDataModel.itemCount ? `offset-${offset + itemRetrievalCount}` : undefined;
  return results;
}

class ApiResponseImpl<Data> implements ApiResponse<Data> {

  ok: boolean;
  statusCode: number;
  private data: Data;

  constructor(ok: boolean, statusCode: number, data: Data) {
    this.ok = ok;
    this.statusCode = statusCode;
    this.data = data;
  }

  getData = async (): Promise<Data> => {
    return this.data;
  }

}
