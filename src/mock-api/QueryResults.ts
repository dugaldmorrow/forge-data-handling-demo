import { Cursor } from "src/types/Cursor";

export type QueryResults<ItemType> = {
  items: ItemType[];
  nextCursor: undefined | Cursor;
}
