import { Schema } from "effect";

/**
 * Why connecting an account did not go through, for clients to explain:
 *
 * - `platformNotSupported`: this server has no way to connect the platform.
 * - `notConfigured`: the server lacks a setting the platform needs, such as
 *   the token keyring or the Bluesky client keys.
 * - `invalidInstance`: the instance is not the address of a server.
 * - `instanceNotAllowed`: the instance is not reachable over HTTPS on a
 *   public address, so Acme refuses to call it.
 * - `invalidHandle`: the handle or DID names no account.
 * - `invalidState`: the connection is unknown, expired, already completed,
 *   or was started by someone else: start again.
 * - `denied`: the account's owner refused on the platform.
 * - `authorizationFailed`: the platform refused to hand over the account.
 * - `accountMismatch`: reconnecting signed in to a different account than the
 *   channel's.
 */
export const ConnectFailureReasonSchema = Schema.Literals([
  "platformNotSupported",
  "notConfigured",
  "invalidInstance",
  "instanceNotAllowed",
  "invalidHandle",
  "invalidState",
  "denied",
  "authorizationFailed",
  "accountMismatch",
]).annotate({ identifier: "ConnectFailureReason" });

export type ConnectFailureReason = typeof ConnectFailureReasonSchema.Type;

/** Connecting or reconnecting an account did not go through. */
export class ConnectFailed extends Schema.TaggedError<ConnectFailed>()(
  "ConnectFailed",
  { reason: ConnectFailureReasonSchema },
  {
    description:
      "The account was not connected; `reason` says why. Nothing was saved.",
    httpApiStatus: 422,
  }
) {}
