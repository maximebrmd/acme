import { Option, Schema } from "effect";

import type { Actor } from "#shared/domain/access.ts";
import { UserIdSchema } from "#shared/domain/ids.ts";

import { ReviewLinkIdSchema } from "./review-ids.ts";

/**
 * Who commented on a post or decided on its approval: a member of the
 * workspace (none once they closed their account); an API key of the
 * workspace; or a visitor, someone without an account who came through a
 * link and gave a name. A visitor's name is none once its retention is over
 * (`./review-retention.ts`).
 *
 * Stored with comments and approval requests as JSON: add a member or a
 * field, never rename or remove one.
 */
export const ReviewerSchema = Schema.Union([
  Schema.TaggedStruct("member", { userId: Schema.Option(UserIdSchema) }),
  Schema.TaggedStruct("apiKey", {}),
  Schema.TaggedStruct("visitor", {
    linkId: ReviewLinkIdSchema,
    name: Schema.Option(Schema.NonEmptyString),
  }),
]);

export type Reviewer = typeof ReviewerSchema.Type;

/** The reviewer an actor is: the member, or the workspace's API key. */
export const reviewerOf = ({ subject }: Actor): Reviewer =>
  subject._tag === "user"
    ? { _tag: "member", userId: Option.some(subject.userId) }
    : { _tag: "apiKey" };
