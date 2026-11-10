// The account project: what the whole Cloudflare account shares (README.md).
import * as pulumi from "@pulumi/pulumi";

import { account } from "../src/account.ts";
import { importExisting } from "../src/imports.ts";
import { AccountSettingsSchema, readSettings } from "../src/settings.ts";

importExisting();

const shared = account(
  readSettings(AccountSettingsSchema, [
    "accountId",
    "domain",
    "ownerName",
    "zoneId",
  ]),
  new pulumi.Config("peal").requireSecret("ownerEmail")
);

export const { ownerPolicyId, publicCallbacksPolicyId, forwardedAddresses } =
  shared;
