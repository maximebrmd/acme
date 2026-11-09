import type { ConnectFailureReason } from "acme-contract";
import { Cause, Exit, Option } from "effect";
import { Atom } from "effect/reactivity";

import { AcmeApi } from "#api/client.ts";

// What refreshes a workspace's channel list once a change lands.
const channelsKey = (workspaceId: string) => `channels:${workspaceId}`;

export const channelsChanged = (workspaceId: string) => [
  channelsKey(workspaceId),
];

/** The workspace's channels, fetched through /api with the visitor's cookies. */
export const channelsOf = Atom.family((workspaceId: string) =>
  AcmeApi.query("channels", "list", {
    params: { workspaceId },
    reactivityKeys: channelsChanged(workspaceId),
  })
);

/** The platforms this server connects, fetched with the visitor's cookies. */
export const connectablePlatformsOf = Atom.family((workspaceId: string) =>
  AcmeApi.query("channels", "platforms", { params: { workspaceId } })
);

export const connectChannel = AcmeApi.mutation("channels", "connect");

export const completeConnection = AcmeApi.mutation(
  "channels",
  "completeConnect"
);

export const chooseAccounts = AcmeApi.mutation("channels", "chooseAccounts");

export const reconnectChannel = AcmeApi.mutation("channels", "reconnect");

export const disconnectChannel = AcmeApi.mutation("channels", "disconnect");

/** The message explaining why a channel action failed. */
export type ChannelErrorKey =
  | ConnectFailureReason
  | "forbidden"
  | "notFound"
  | "unknown"
  | "unreachable";

interface Tagged {
  readonly _tag: string;
  readonly reason?: ConnectFailureReason;
}

// The contract's errors, told apart by tag; anything else, such as the
// server being down, is unknown.
const keyOf = (error: Tagged): ChannelErrorKey => {
  switch (error._tag) {
    case "ConnectFailed": {
      return error.reason ?? "unknown";
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
