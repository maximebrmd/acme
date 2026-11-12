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

export const AccountSettingsSchema = Schema.Struct({
  ...CloudflareSchema.fields,
  // The domain of the short links (peal.link), a zone of its own.
  linkDomain: Schema.NonEmptyString,
  // The owner's first name, in the name of the policy that lets them in.
  ownerName: Schema.NonEmptyString,
});

export type AccountSettings = typeof AccountSettingsSchema.Type;

/** What the short-link domain's component reads of the account's settings. */
export type LinkDomainSettings = Pick<
  AccountSettings,
  "accountId" | "domain" | "linkDomain"
>;

/**
 * A host name of an environment, on its domain: a first-level label
 * (`docs` for docs.<domain>), as Cloudflare's free certificate covers the
 * zone and its first-level subdomains alone, or `@` for the bare domain
 * (production's site, peal.social).
 */
const HostnameSchema = Schema.String.check(
  Schema.isPattern(/^(?:@|[a-z\d](?:[a-z\d-]*[a-z\d])?)$/u)
);

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

/** The project's `peal:` settings of the current stack, decoded. */
export const readSettings = <A>(
  schema: Schema.Codec<A, unknown>,
  keys: readonly string[]
): A => {
  const config = new pulumi.Config("peal");

  // Pulumi gives every setting as text, an object as its JSON.
  const raw = Object.fromEntries(
    keys.map((key) => {
      const text = config.require(key);

      return [key, text.startsWith("{") ? JSON.parse(text) : text];
    })
  );

  return Schema.decodeUnknownSync(schema)(raw);
};
