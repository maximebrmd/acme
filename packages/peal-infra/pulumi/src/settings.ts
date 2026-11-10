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
  // The owner's first name, in the name of the policy that lets them in.
  ownerName: Schema.NonEmptyString,
});

export type AccountSettings = typeof AccountSettingsSchema.Type;

/** The first-level subdomains of an environment's host names. */
const HostnamesSchema = Schema.Struct({
  app: Schema.NonEmptyString,
  docs: Schema.NonEmptyString,
  grafana: Schema.NonEmptyString,
  site: Schema.NonEmptyString,
  ssh: Schema.NonEmptyString,
});

export const EnvironmentSettingsSchema = Schema.Struct({
  ...CloudflareSchema.fields,
  // The account project's stack, whose Access policies the applications use.
  accountStack: Schema.NonEmptyString,
  environment: Schema.Literals(["sandbox", "production"]),
  hostnames: HostnamesSchema,
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
