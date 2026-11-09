import { Schema } from "effect";

import type { Platform } from "./platform.ts";

/**
 * The Meta apps that send data deletion requests: the main app, whose
 * Facebook Login connects Facebook Pages and the Instagram accounts linked
 * to them, and its Threads credentials, which sign Threads users in.
 */
export const MetaAppKindSchema = Schema.Literals(["facebook", "threads"]);

export type MetaAppKind = typeof MetaAppKindSchema.Type;

/** The platforms whose channels a user of the app connects. */
export const platformsSignedInWith = (app: MetaAppKind): readonly Platform[] =>
  app === "facebook" ? ["facebook", "instagram"] : ["threads"];

/**
 * A data deletion request Meta sent for one of its users, once carried out:
 * the channels that user's grant held up were deleted. It keeps nothing
 * about the user, only what the status page shows: `code`, which Meta shows
 * the user, when it came, and how many channels went.
 */
export class DataDeletion extends Schema.Class<DataDeletion>(
  "peal-server/channels/domain/DataDeletion"
)({
  app: MetaAppKindSchema,
  channelsDeleted: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  code: Schema.String.check(Schema.isPattern(/^[\da-z]{8,64}$/u)),
  completedAt: Schema.DateTimeUtc,
  requestedAt: Schema.DateTimeUtc,
}) {}
