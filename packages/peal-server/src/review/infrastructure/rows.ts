import { DateTime, Option, Schema } from "effect";

import { ReviewerSchema } from "#review/domain/reviewer.ts";
import type { Reviewer } from "#review/domain/reviewer.ts";
import { DatabaseError } from "#shared/application/database-error.ts";

// What the review context's adapters share to read and write its rows.

export const failed = (cause: unknown) => new DatabaseError({ cause });

export const date = (instant: DateTime.Utc) => DateTime.toDateUtc(instant);

export const utc = (value: Date) => DateTime.fromDateUnsafe(value);

export const utcOption = (value: Date | null) =>
  Option.fromNullOr(value).pipe(Option.map(utc));

/** A reviewer as the columns of a row hold one. */
export interface ReviewerColumns {
  readonly kind: string;
  readonly linkId: string | null;
  readonly name: string | null;
  readonly userId: string | null;
}

export const reviewerColumns = (reviewer: Reviewer): ReviewerColumns => {
  if (reviewer._tag === "member") {
    return {
      kind: "member",
      linkId: null,
      name: null,
      userId: Option.getOrNull(reviewer.userId),
    };
  }

  return reviewer._tag === "visitor"
    ? {
        kind: "visitor",
        linkId: reviewer.linkId,
        name: Option.getOrNull(reviewer.name),
        userId: null,
      }
    : { kind: "apiKey", linkId: null, name: null, userId: null };
};

const decodeReviewer = Schema.decodeUnknownEffect(ReviewerSchema);

// Rows are decoded with the domain's schemas, so one the domain could not
// have written fails loudly instead of being trusted.
export const reviewerOfColumns = ({
  kind,
  linkId,
  name,
  userId,
}: ReviewerColumns) =>
  decodeReviewer({
    _tag: kind,
    linkId,
    name: Option.fromNullOr(name),
    userId: Option.fromNullOr(userId),
  });
