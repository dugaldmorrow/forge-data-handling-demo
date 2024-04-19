import { Cursor } from "src/data-processing-framework/types/Cursor";

export type QueryResults<ItemType> = {
  items: ItemType[];
  nextCursor: undefined | Cursor;
}
