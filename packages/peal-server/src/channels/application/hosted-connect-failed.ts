import { Schema } from "effect";

/**
 * Why a hosted page connected nothing, as it tells whoever holds the link:
 * the reasons a member's own connection fails for, and those of the link
 * itself (`linkExpired`, `linkCompleted`, `linkRevoked`, `tooManyAttempts`),
 * of the workspace (`planLimit`: no room for one more channel;
 * `channelGone`: the channel to reconnect was disconnected), of the
 * platform for now (`platformUnreachable`), and a platform the link does
 * not connect, or connected already (`platformNotOffered`).
 */
export const HostedFailureReasonSchema = Schema.Literals([
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
  "platformNotOffered",
]);

export type HostedFailureReason = typeof HostedFailureReasonSchema.Type;

/**
 * A hosted page connected nothing. `returnTo` is where it may send the
 * browser back, when the link has a return address.
 */
export class HostedConnectFailed extends Schema.TaggedError<HostedConnectFailed>()(
  "HostedConnectFailed",
  {
    reason: HostedFailureReasonSchema,
    returnTo: Schema.Option(Schema.String),
  }
) {}
