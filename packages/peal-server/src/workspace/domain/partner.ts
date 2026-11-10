import { Option, Result, Schema } from "effect";
import type { DateTime } from "effect";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

import { InvalidPartnerLogo } from "./invalid-partner-logo.ts";
import { PartnerIdSchema } from "./partner-id.ts";
import type { PartnerId } from "./partner-id.ts";
import { ReturnOriginSchema } from "./return-origin.ts";
import type { ReturnOrigin } from "./return-origin.ts";

export const maxPartnerNameLength = 80;

export const maxPartnerLogoUrlLength = 2048;

/**
 * What a partner is called on the pages its customers see. Not empty, and
 * without control or formatting characters, as it is shown to people who
 * never chose it.
 */
export const PartnerNameSchema = Schema.Trim.check(
  Schema.isBetweenLength(1, maxPartnerNameLength),
  Schema.isPattern(/^[^\p{Cc}\p{Cf}\p{Zl}\p{Zp}]*$/u)
);

/**
 * A partner account: a product that embeds Peal, and owns one workspace
 * for each of its own customers. It belongs to its home workspace, whose
 * members manage it and whose plan every workspace it owns shares. Its
 * name and logo are what its customers see on the hosted pages; its return
 * origins are the only places those pages send them back to.
 */
export class Partner extends Schema.Class<Partner>(
  "peal-server/workspace/domain/Partner"
)({
  createdAt: Schema.DateTimeUtc,
  id: PartnerIdSchema,
  // Shown from its own address, in the customer's browser: Peal never
  // fetches it.
  logoUrl: Schema.Option(Schema.NonEmptyString),
  name: Schema.NonEmptyString,
  returnOrigins: Schema.Array(ReturnOriginSchema),
  updatedAt: Schema.DateTimeUtc,
  // Its home workspace.
  workspaceId: WorkspaceIdSchema,
}) {}

/**
 * The address of a logo as a partner's hosted pages show it: HTTPS, on the
 * default port, without credentials. Browsers load it from there; the
 * server never does.
 */
export const parseLogoUrl = (
  input: string
): Result.Result<string, InvalidPartnerLogo> => {
  if (input.length > maxPartnerLogoUrlLength || !URL.canParse(input)) {
    return Result.fail(new InvalidPartnerLogo());
  }

  const url = new URL(input);

  return url.protocol === "https:" &&
    url.port === "" &&
    url.username === "" &&
    url.password === ""
    ? Result.succeed(url.href)
    : Result.fail(new InvalidPartnerLogo());
};

/** A new partner account of the workspace. */
export const openPartner = (
  id: PartnerId,
  workspaceId: WorkspaceId,
  name: string,
  now: DateTime.Utc
): Partner =>
  new Partner({
    createdAt: now,
    id,
    logoUrl: Option.none(),
    name,
    returnOrigins: [],
    updatedAt: now,
    workspaceId,
  });

/** What its people may change of a partner account. */
export interface PartnerChange {
  /** None removes the logo. */
  readonly logoUrl?: Option.Option<string>;
  readonly name?: string;
  readonly returnOrigins?: readonly ReturnOrigin[];
}

/** The partner with what was changed, each origin once. */
export const changePartner = (
  partner: Partner,
  change: PartnerChange,
  now: DateTime.Utc
): Partner =>
  new Partner({
    createdAt: partner.createdAt,
    id: partner.id,
    logoUrl: change.logoUrl ?? partner.logoUrl,
    name: change.name ?? partner.name,
    returnOrigins:
      change.returnOrigins === undefined
        ? partner.returnOrigins
        : [...new Set(change.returnOrigins)],
    updatedAt: now,
    workspaceId: partner.workspaceId,
  });
