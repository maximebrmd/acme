import {
  Config,
  Context,
  Effect,
  Layer,
  Option,
  Result,
  Schema,
  SchemaTransformation,
} from "effect";
import { Dns, IpNetwork, NetAddress } from "effect/net";

import { OutboundRequestRefused } from "./outbound-request-refused.ts";

// Special-purpose ranges that are not public unicast, beyond what NetAddress
// classifies itself (loopback, link-local, RFC 1918, unique local, multicast,
// unspecified, broadcast). From the IANA special-purpose address registries.
const reserved: readonly IpNetwork.IpNetwork[] = [
  // "This network", shared address space (CGNAT), IETF protocol
  // assignments, documentation, the 6to4 relay, benchmarking, reserved.
  "0.0.0.0/8",
  "100.64.0.0/10",
  "192.0.0.0/24",
  "192.0.2.0/24",
  "192.88.99.0/24",
  "198.18.0.0/15",
  "198.51.100.0/24",
  "203.0.113.0/24",
  "240.0.0.0/4",
  // NAT64 and translated addresses, which carry an IPv4 address inside;
  // discard-only; Teredo, benchmarking, ORCHID and documentation; 6to4;
  // site-local.
  "64:ff9b::/96",
  "64:ff9b:1::/48",
  "100::/64",
  "2001::/32",
  "2001:2::/48",
  "2001:10::/28",
  "2001:20::/28",
  "2001:db8::/32",
  "2002::/16",
  "3fff::/20",
  "fec0::/10",
].map((network) => IpNetwork.fromStringUnsafe(network));

// Every public IPv6 address is global unicast, which IANA allocates from
// this block only. Outside it are the forms that carry an IPv4 address
// (IPv4-compatible, translated), and ranges not meant for the internet.
const globalUnicast = IpNetwork.fromStringUnsafe("2000::/3");

/** Whether an address is one anyone on the internet could reach. */
export const isPublicAddress = (address: NetAddress.IpAddress): boolean => {
  if (NetAddress.isIpv6Address(address)) {
    const mapped = NetAddress.fromIpv4Mapped(address);

    if (Option.isSome(mapped)) {
      return isPublicAddress(mapped.value);
    }

    if (!IpNetwork.contains(globalUnicast, address)) {
      return false;
    }
  } else if (NetAddress.isPrivate(address)) {
    return false;
  }

  return (
    NetAddress.isUnicast(address) &&
    !NetAddress.isLoopback(address) &&
    !NetAddress.isLinkLocal(address) &&
    !reserved.some((network) => IpNetwork.contains(network, address))
  );
};

// An IPv6 host comes out of URL in brackets.
const literalOf = (hostname: string): Option.Option<NetAddress.IpAddress> =>
  Result.getSuccess(
    NetAddress.ipFromString(hostname.replaceAll(/^\[|\]$/gu, ""))
  );

const refused = (host: string, reason: OutboundRequestRefused["reason"]) =>
  new OutboundRequestRefused({ host, reason });

// A name that does not exist is the user's typo; anything else may pass.
const lookupFailure = (host: string, error: Dns.DnsError) =>
  refused(
    host,
    error.reason === "NotFound" || error.reason === "BadName"
      ? "unknownHost"
      : "lookupFailed"
  );

// A host name or an address as URL writes it, lowercase: no scheme, port,
// path or wildcard.
const hostPattern =
  /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$|^\[[0-9a-f:.]+\]$/u;

const AllowedHostsSchema = Schema.String.pipe(
  Schema.decodeTo(
    Schema.Array(
      Schema.String.check(
        Schema.isPattern(hostPattern, {
          expected: "a host name, without a scheme, a port or a wildcard",
        })
      )
    ),
    SchemaTransformation.transform({
      decode: (value: string) =>
        value
          .split(",")
          .map((host) => host.trim().toLowerCase())
          .filter((host) => host !== ""),
      encode: (hosts: readonly string[]) => hosts.join(","),
    })
  )
);

/**
 * `PEAL_OUTBOUND_ALLOWED_HOSTS`: the hosts, by name or address, that a
 * self-hoster lets Peal reach although they are not public (a site on
 * their own network), comma-separated. Empty by default, and on Peal's own
 * service, where nothing a user names may lead inside. Anything but host
 * names stops the server.
 */
export const allowedHostsConfig = Config.schema(
  AllowedHostsSchema,
  "PEAL_OUTBOUND_ALLOWED_HOSTS"
).pipe(
  Config.withDefault<readonly string[]>([]),
  Config.map((hosts): ReadonlySet<string> => new Set(hosts))
);

/**
 * Checks URLs that users chose (a Mastodon instance, a Bluesky server named
 * in a DID document) before Peal sends anything there: HTTPS on the default
 * port, to a host whose every address is public, so a request cannot reach a
 * service inside Peal's own network. Clients that use it follow no redirects.
 *
 * The check resolves the name itself, so a name that changes its answer
 * between this lookup and the connection could still lead elsewhere; the
 * guard narrows server-side request forgery to that window.
 *
 * A host the operator allows (`PEAL_OUTBOUND_ALLOWED_HOSTS`) is reached
 * whatever its addresses, still over HTTPS on the default port.
 */
export class OutboundGuard extends Context.Service<
  OutboundGuard,
  {
    readonly check: (url: URL) => Effect.Effect<void, OutboundRequestRefused>;
  }
>()("peal-server/shared/infrastructure/OutboundGuard") {
  /** The guard, resolving names with the runtime's `Dns`. */
  static readonly layer = Layer.effect(
    OutboundGuard,
    Effect.gen(function* OutboundGuardLive() {
      const dns = yield* Dns.Dns;
      const allowed = yield* allowedHostsConfig;

      const addressesOf = (
        hostname: string
      ): Effect.Effect<
        readonly NetAddress.IpAddress[],
        OutboundRequestRefused
      > =>
        literalOf(hostname).pipe(
          Option.match({
            onNone: () =>
              dns
                .lookup(hostname)
                .pipe(
                  Effect.mapError((failure) => lookupFailure(hostname, failure))
                ),
            onSome: (address) => Effect.succeed([address]),
          })
        );

      const publicOnly = (url: URL) =>
        addressesOf(url.hostname).pipe(
          Effect.flatMap((addresses) =>
            addresses.every(isPublicAddress)
              ? Effect.void
              : Effect.fail(refused(url.host, "notPublic"))
          )
        );

      const check = (url: URL) => {
        if (url.protocol !== "https:" || url.port !== "") {
          return Effect.fail(refused(url.host, "notHttps"));
        }

        return allowed.has(url.hostname.toLowerCase())
          ? Effect.void
          : publicOnly(url).pipe(Effect.withSpan("OutboundGuard.check"));
      };

      return OutboundGuard.of({ check });
    })
  );
}
