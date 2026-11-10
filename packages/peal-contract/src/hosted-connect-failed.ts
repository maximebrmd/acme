import { Schema } from "effect";

/**
 * Why a hosted page connected nothing:
 *
 * - the reasons of `ConnectFailureReason`, as when a member connects an
 *   account themselves (`denied`, `invalidState`, `accountMismatch`…);
 * - `linkExpired`, `linkCompleted`, `linkRevoked`: the link is over;
 * - `tooManyAttempts`: its sign-in was started as many times as a link
 *   allows;
 * - `planLimit`: the workspace's plan has no room for one more channel;
 * - `channelGone`: the channel it was to reconnect was disconnected;
 * - `platformUnreachable`: the platform did not answer for now.
 */
export const HostedConnectFailureSchema = Schema.Literals([
  "platformNotSupported",
  "notConfigured",
  "invalidInstance",
  "instanceNotAllowed",
  "invalidHandle",
  "invalidState",
  "denied",
  "authorizationFailed",
  "accountMismatch",
  "noAccounts",
  "linkExpired",
  "linkCompleted",
  "linkRevoked",
  "tooManyAttempts",
  "planLimit",
  "channelGone",
  "platformUnreachable",
]).annotate({ identifier: "HostedConnectFailure" });

export type HostedConnectFailure = typeof HostedConnectFailureSchema.Type;

/** A hosted page connected nothing. */
export class HostedConnectFailed extends Schema.TaggedError<HostedConnectFailed>()(
  "HostedConnectFailed",
  {
    reason: HostedConnectFailureSchema,
    // Where the page may send the browser back, when the link has a
    // return address.
    returnTo: Schema.NullOr(Schema.String),
  },
  {
    description:
      "Nothing was connected; `reason` says why. A link that is not over can be tried again.",
    httpApiStatus: 422,
  }
) {}
