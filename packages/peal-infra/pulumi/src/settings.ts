import { isIPv4, isIPv6 } from "node:net";

import * as pulumi from "@pulumi/pulumi";
import { Schema } from "effect";

/**
 * What every stack of both projects names: the Cloudflare account and the
 * zone Peal's host names live in.
 */
const CloudflareSchema = Schema.Struct({
  accountId: Schema.NonEmptyString,
  domain: Schema.NonEmptyString,
  zoneId: Schema.NonEmptyString,
});

/**
 * A host name of an environment, on its domain: a first-level label
 * (`docs` for docs.<domain>), as Cloudflare's free certificate covers the
 * zone and its first-level subdomains alone, or `@` for the bare domain
 * (production's site, peal.social).
 */
const HostnameSchema = Schema.String.check(
  Schema.isPattern(/^(?:@|[a-z\d](?:[a-z\d-]*[a-z\d])?)$/u)
);

/** A host name of the domain itself, never the bare domain. */
const LabelSchema = HostnameSchema.check(
  Schema.makeFilter((label) => label !== "@")
);

/**
 * The uptime server (the Ansible project's README, "Uptime"), whose name
 * and status page's name get records the account's stack makes: first-level
 * labels of the domain (uptime_hostname and uptime_status_hostname, there),
 * and its addresses. IPv6 is optional: set it when the server's web server
 * answers on it.
 */
const UptimeSettingsSchema = Schema.Struct({
  hostname: LabelSchema,
  ipv4: Schema.String.check(Schema.makeFilter((address) => isIPv4(address))),
  ipv6: Schema.optionalKey(
    Schema.String.check(Schema.makeFilter((address) => isIPv6(address)))
  ),
  statusHostname: LabelSchema,
});

export type UptimeSettings = typeof UptimeSettingsSchema.Type;

export const AccountSettingsSchema = Schema.Struct({
  ...CloudflareSchema.fields,
  // The domain of the short links (peal.link), a zone of its own.
  linkDomain: Schema.NonEmptyString,
  // The owner's first name, in the name of the policy that lets them in.
  ownerName: Schema.NonEmptyString,
  // The uptime server, once it exists: unset, no record is made for it.
  uptime: Schema.optionalKey(UptimeSettingsSchema),
});

export type AccountSettings = typeof AccountSettingsSchema.Type;

/** What the short-link domain's component reads of the account's settings. */
export type LinkDomainSettings = Pick<
  AccountSettings,
  "accountId" | "domain" | "linkDomain"
>;

/** An environment's host names, on its domain. */
const HostnamesSchema = Schema.Struct({
  app: HostnameSchema,
  docs: HostnameSchema,
  grafana: HostnameSchema,
  site: HostnameSchema,
  ssh: HostnameSchema,
});

export const EnvironmentSettingsSchema = Schema.Struct({
  ...CloudflareSchema.fields,
  // The account project's stack, whose Access policies the applications use.
  accountStack: Schema.NonEmptyString,
  environment: Schema.Literals(["sandbox", "production"]),
  hostnames: HostnamesSchema,
  // The environment's host name on the short-link domain, whose zone the
  // account's stack holds: the domain itself or a first-level subdomain.
  shortLinkHost: Schema.NonEmptyString,
});

export type EnvironmentSettings = typeof EnvironmentSettingsSchema.Type;

/**
 * The project's `peal:` settings of the current stack, decoded: each of
 * `keys` is required, each of `optionalKeys` read when set. A secret
 * setting is read in clear here: what makes a resource of it keeps it a
 * secret (`pulumi.secret`).
 */
export const readSettings = <A>(
  schema: Schema.Codec<A, unknown>,
  keys: readonly string[],
  optionalKeys: readonly string[] = []
): A => {
  const config = new pulumi.Config("peal");

  const texts = [
    ...keys.map((key) => [key, config.require(key)] as const),
    ...optionalKeys.flatMap((key) => {
      const text = config.get(key);

      return text === undefined ? [] : [[key, text] as const];
    }),
  ];

  // Pulumi gives every setting as text, an object as its JSON.
  const raw = Object.fromEntries(
    texts.map(([key, text]) => [
      key,
      text.startsWith("{") ? JSON.parse(text) : text,
    ])
  );

  return Schema.decodeUnknownSync(schema)(raw);
};
