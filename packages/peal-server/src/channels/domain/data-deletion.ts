import { Option, Schema } from "effect";

import type { InstagramConnection } from "#shared/domain/instagram-connection.ts";

import type { Platform } from "./platform.ts";

/**
 * The Meta apps that send data deletion and deauthorization requests: the
 * main app, whose Facebook Login connects Facebook Pages and the Instagram
 * accounts linked to them, its Instagram credentials, whose Business Login
 * for Instagram signs professional accounts in, and its Threads
 * credentials, which sign Threads users in.
 */
export const MetaAppKindSchema = Schema.Literals([
  "facebook",
  "instagram",
  "threads",
]);

export type MetaAppKind = typeof MetaAppKindSchema.Type;

/**
 * Channels a user of an app connects: those of the platform, and for
 * Instagram those of the connection the app signs in with.
 */
export interface SignedInChannels {
  readonly connection: Option.Option<InstagramConnection>;
  readonly platform: Platform;
}

/**
 * The channels a user of the app connects, which a request through it is
 * about. Each app signs in its own way: a request through the main app
 * never touches an account connected with Instagram Login, nor one through
 * the Instagram app an account reached through a Page.
 */
export const channelsSignedInWith = (
  app: MetaAppKind
): readonly SignedInChannels[] => {
  if (app === "facebook") {
    return [
      { connection: Option.none(), platform: "facebook" },
      { connection: Option.some("facebookLogin"), platform: "instagram" },
    ];
  }

  return app === "instagram"
    ? [{ connection: Option.some("instagramLogin"), platform: "instagram" }]
    : [{ connection: Option.none(), platform: "threads" }];
};

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
