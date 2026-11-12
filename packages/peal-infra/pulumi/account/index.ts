// The account project: what the whole Cloudflare account shares (README.md).
import * as pulumi from "@pulumi/pulumi";

import { PealAccount } from "../src/account.ts";
import { importExisting } from "../src/imports.ts";
import { PealLinkDomain } from "../src/link-domain.ts";
import { AccountSettingsSchema, readSettings } from "../src/settings.ts";

importExisting();

const settings = readSettings(AccountSettingsSchema, [
  "accountId",
  "domain",
  "linkDomain",
  "ownerName",
  "zoneId",
]);

const shared = new PealAccount(
  "account",
  settings,
  new pulumi.Config("peal").requireSecret("ownerEmail")
);

// The short-link domain's zone, which each environment's stack puts its
// short-link host name on.
const link = new PealLinkDomain("link", settings);

export const { forwardedAddresses, ownerPolicyId, publicCallbacksPolicyId } =
  shared;

export const linkZoneId = link.zoneId;
