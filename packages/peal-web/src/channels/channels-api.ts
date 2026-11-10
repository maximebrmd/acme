import { Cause, Exit, Option, Schema } from "effect";
import { Atom } from "effect/reactivity";
import { ConnectFailureReasonSchema } from "peal-contract";
import type { ConnectFailureReason } from "peal-contract";

import { PealApi } from "#api/client.ts";

// What refreshes a workspace's channel list once a change lands.
const channelsKey = (workspaceId: string) => `channels:${workspaceId}`;

// What the composer, the calendar and the reports read their channels
// under (`workspaceChannels`): a change here shows there too.
const everyChannelList = "channels";

export const channelsChanged = (workspaceId: string) => [
  channelsKey(workspaceId),
  everyChannelList,
];

/** The workspace's channels, fetched through /api with the visitor's cookies. */
export const channelsOf = Atom.family((workspaceId: string) =>
  PealApi.query("channels", "list", {
    params: { workspaceId },
    reactivityKeys: channelsChanged(workspaceId),
  })
);

/**
 * The platforms this server connects, in Peal's order, fetched with the
 * visitor's cookies.
 */
export const connectablePlatformsOf = Atom.family((workspaceId: string) =>
  PealApi.query("channels", "platforms", { params: { workspaceId } })
);

export const connectChannel = PealApi.mutation("channels", "connect");

export const completeConnection = PealApi.mutation(
  "channels",
  "completeConnect"
);

export const chooseAccounts = PealApi.mutation("channels", "chooseAccounts");

export const reconnectChannel = PealApi.mutation("channels", "reconnect");

export const disconnectChannel = PealApi.mutation("channels", "disconnect");

/** Gives a channel the workspace's own name for it, or takes it back. */
export const renameChannel = PealApi.mutation("channels", "update");

/** Turns a channel off: nothing goes out on it until it is turned back on. */
export const disableChannel = PealApi.mutation("channels", "disable");

export const enableChannel = PealApi.mutation("channels", "enable");

/**
 * The message explaining why a channel action failed: a ChannelsPage error,
 * or `planLimit`, which Billing explains.
 */
export type ChannelErrorKey =
  | ConnectFailureReason
  | "forbidden"
  | "notFound"
  | "planLimit"
  | "unknown"
  | "unreachable";

// Several errors give a `reason`, each from its own list.
interface Tagged {
  readonly _tag: string;
  readonly reason?: string;
}

const isConnectFailure = Schema.is(ConnectFailureReasonSchema);

// The contract's errors, told apart by tag; anything else, such as the
// server being down, is unknown.
const keyOf = (error: Tagged): ChannelErrorKey => {
  switch (error._tag) {
    case "ConnectFailed": {
      return isConnectFailure(error.reason) ? error.reason : "unknown";
    }

    case "PlatformUnreachable": {
      return "unreachable";
    }

    case "Forbidden": {
      return "forbidden";
    }

    case "ChannelNotFound": {
      return "notFound";
    }

    case "PlanLimitReached": {
      return "planLimit";
    }

    default: {
      return "unknown";
    }
  }
};

/** The message key for what a mutation ended with, or none if it worked. */
export const failureOf = <A, E extends Tagged>(
  exit: Exit.Exit<A, E>
): Option.Option<ChannelErrorKey> =>
  Exit.isFailure(exit)
    ? Option.some(
        Cause.findErrorOption(exit.cause).pipe(
          Option.match({
            onNone: (): ChannelErrorKey => "unknown",
            onSome: keyOf,
          })
        )
      )
    : Option.none();
