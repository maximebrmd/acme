import type { DateTime } from "effect";
import { Option, Schema } from "effect";
import { HostedConnectFailureSchema } from "peal-contract";
import type {
  ConnectLink as ConnectLinkView,
  ConnectLinkStatus,
} from "peal-contract";

import { isExpired } from "#channels/domain/connect-link.ts";
import type { ConnectLink } from "#channels/domain/connect-link.ts";

const decodeFailure = Schema.decodeUnknownOption(HostedConnectFailureSchema);

/** Where a link stands at `now`: one left pending past its time expired. */
export const linkStatusAt = (
  link: ConnectLink,
  now: DateTime.Utc
): ConnectLinkStatus => (isExpired(link, now) ? "expired" : link.status._tag);

/** A link as the API and the MCP tools show it: never its token. */
export const toConnectLinkView = (
  link: ConnectLink,
  now: DateTime.Utc
): ConnectLinkView => {
  const { status } = link;

  return {
    channelId: Option.getOrNull(link.channelId),
    channelIds: status._tag === "completed" ? status.channelIds : [],
    completedAt: status._tag === "pending" ? null : status.at,
    createdAt: link.createdAt,
    expiresAt: link.expiresAt,
    failedAt: Option.getOrNull(link.failure.pipe(Option.map(({ at }) => at))),
    // A reason the contract no longer names is not shown.
    failure: Option.getOrNull(
      link.failure.pipe(Option.flatMap(({ reason }) => decodeFailure(reason)))
    ),
    id: link.id,
    platform: link.platform,
    returnUrl: Option.getOrNull(link.returnUrl),
    status: linkStatusAt(link, now),
  };
};
