import { DateTime, Option } from "effect";

import { DatabaseError } from "#shared/application/database-error.ts";

/** A failed statement, as every store of the context reports one. */
export const failed = (cause: unknown) => new DatabaseError({ cause });

export const date = (instant: DateTime.Utc) => DateTime.toDateUtc(instant);

export const dateOrNull = (instant: Option.Option<DateTime.Utc>) =>
  instant.pipe(Option.map(date), Option.getOrNull);

export const utc = (stored: Date) => DateTime.fromDateUnsafe(stored);

export const utcOrNone = (stored: Date | null) =>
  Option.fromNullOr(stored).pipe(Option.map(utc));
