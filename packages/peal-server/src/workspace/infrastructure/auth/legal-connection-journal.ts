import { getIPFromHeader } from "@better-auth/core/utils/ip";
import { Effect, Layer, Option } from "effect";

import { LegalRecords } from "#legal/application/legal-records.ts";
import { ConnectionJournal } from "#workspace/application/connection-journal.ts";
import type { RequestOrigin } from "#workspace/application/connection-journal.ts";

import { AuthSettings } from "./settings.ts";

/**
 * The client's address as Better Auth reads it for its rate limits: from
 * the headers the edge sets (`AUTH_IP_HEADERS`), past the trusted proxies
 * (`AUTH_TRUSTED_PROXIES`), else the socket's peer. In full, IPv6 included:
 * it identifies a connection, not a rate-limit bucket.
 */
const addressOf = (
  origin: RequestOrigin,
  settings: {
    readonly ipAddressHeaders: readonly string[];
    readonly trustedProxies: readonly string[];
  }
): string | null => {
  for (const name of settings.ipAddressHeaders) {
    const value = origin.headers[name.toLowerCase()];

    const address =
      value === undefined
        ? null
        : getIPFromHeader(value, {
            ipv6Subnet: 128,
            trustedProxies: [...settings.trustedProxies],
          });

    if (address !== null) {
      return address;
    }
  }

  return Option.getOrNull(origin.remoteAddress);
};

/**
 * The connections that make content, in the legal context's records, with
 * the address read as Better Auth reads it and the protocol of PUBLIC_URL,
 * which every request reaches Peal through.
 */
export const LegalConnectionJournal = Layer.effect(
  ConnectionJournal,
  Effect.gen(function* LegalConnectionJournal() {
    const legal = yield* LegalRecords;
    const settings = yield* AuthSettings;
    const protocol = new URL(settings.publicUrl).protocol.replace(":", "");

    return ConnectionJournal.of({
      contentChanged: (change) =>
        legal.connected({
          access: change.access,
          apiKeyId: Option.getOrNull(change.apiKeyId),
          ipAddress: addressOf(change.origin, settings),
          protocol,
          userId: Option.getOrNull(change.userId),
          workspaceId: Option.getOrNull(change.workspaceId),
        }),
    });
  })
);
