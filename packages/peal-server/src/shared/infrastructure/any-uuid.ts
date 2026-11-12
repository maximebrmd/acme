import { sql } from "drizzle-orm";
import type { AnyColumn, SQL } from "drizzle-orm";

/**
 * `column = ANY(…)` over ids passed as one text parameter, split in the
 * database: a statement takes 65,535 parameters at most, and Drizzle's
 * `inArray` spends one an id, so a list of every workspace a partner holds
 * would pass it. The ids are UUIDs, which hold no comma.
 */
export const anyUuid = (column: AnyColumn, ids: readonly string[]): SQL =>
  sql`${column} = ANY(string_to_array(${ids.join(",")}, ',')::uuid[])`;
