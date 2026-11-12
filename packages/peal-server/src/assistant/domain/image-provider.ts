import { Result, Schema } from "effect";

import { storableLine } from "#shared/domain/platform-text.ts";

import { ProviderAddressRejected } from "./provider-address-rejected.ts";
import { ProviderSettingRejected } from "./provider-setting-rejected.ts";

/** The longest address of a workspace's image provider, as `URL.href` writes it. */
export const maxProviderAddressLength = 2048;

/** The longest model name a workspace's image provider is asked for. */
export const maxProviderModelLength = 200;

/** The longest key of a workspace's image provider. */
export const maxProviderKeyLength = 500;

/**
 * Where a workspace's image provider is reached: an absolute HTTPS address
 * (HTTP outside production), without a user, a password, a query or a
 * fragment, and without the slashes that end it, so the API's paths
 * (`/images/generations`) follow it. Whether its host is public is the
 * outbound guard's to say, when it is saved and before every call.
 */
export const ProviderAddressSchema = Schema.NonEmptyString.pipe(
  Schema.brand("ProviderAddress")
);

export type ProviderAddress = typeof ProviderAddressSchema.Type;

/** The model the provider is asked for: one line, as the workspace wrote it. */
export const ProviderModelSchema = Schema.NonEmptyString.check(
  Schema.isMaxLength(maxProviderModelLength)
).pipe(Schema.brand("ProviderModel"));

export type ProviderModel = typeof ProviderModelSchema.Type;

/**
 * The settings of the image provider a workspace brought: its address, its
 * model and when they were saved. Its key is kept apart, sealed, and never
 * part of them.
 */
export class ImageProviderSettings extends Schema.Class<ImageProviderSettings>(
  "peal-server/assistant/domain/ImageProviderSettings"
)({
  baseUrl: ProviderAddressSchema,
  model: ProviderModelSchema,
  updatedAt: Schema.DateTimeUtc,
}) {}

const refused = (reason: ProviderAddressRejected["reason"]) =>
  Result.fail(new ProviderAddressRejected({ reason }));

/**
 * The address as a workspace's provider keeps it, or why it is refused.
 * `production` says whether plain HTTP is refused too; the infrastructure
 * knows, the domain is told.
 */
export const checkProviderAddress = (
  text: string,
  { production }: { readonly production: boolean }
): Result.Result<ProviderAddress, ProviderAddressRejected> => {
  const url = URL.parse(text.trim());

  if (url === null) {
    return refused("malformed");
  }

  if (url.protocol !== "https:" && (production || url.protocol !== "http:")) {
    return refused("notHttps");
  }

  if (url.host === "") {
    return refused("malformed");
  }

  if (url.href.length > maxProviderAddressLength) {
    return refused("tooLong");
  }

  if (url.username !== "" || url.password !== "") {
    return refused("credentials");
  }

  // A path writes `?` and `#` encoded: either one here starts a query or a
  // fragment, an empty one included.
  if (url.href.includes("?") || url.href.includes("#")) {
    return refused("queryOrFragment");
  }

  return Result.succeed(
    ProviderAddressSchema.make(url.href.replace(/\/+$/u, ""))
  );
};

/**
 * Where a key is sent, as a browser compares origins: scheme, host and
 * port. A workspace's key is sealed for one, so it never reaches another.
 */
export const originOfProvider = (address: ProviderAddress): string =>
  new URL(address).origin;

/**
 * The model as the provider is asked for it: one line of 1 to
 * `maxProviderModelLength` characters, which `storableLine` would keep as
 * it is (no control characters, no marks that reorder text).
 */
export const checkProviderModel = (
  text: string
): Result.Result<ProviderModel, ProviderSettingRejected> => {
  const model = text.trim();

  return model !== "" &&
    model.length <= maxProviderModelLength &&
    storableLine(model, maxProviderModelLength) === model
    ? Result.succeed(ProviderModelSchema.make(model))
    : Result.fail(new ProviderSettingRejected({ field: "model" }));
};

// What a bearer token may hold: visible ASCII, as an HTTP header does.
const keyPattern = /^[!-~]+$/u;

/** The key as it is sent: 1 to `maxProviderKeyLength` visible characters. */
export const checkProviderKey = (
  text: string
): Result.Result<string, ProviderSettingRejected> =>
  text.length <= maxProviderKeyLength && keyPattern.test(text)
    ? Result.succeed(text)
    : Result.fail(new ProviderSettingRejected({ field: "apiKey" }));
