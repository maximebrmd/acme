// The environment project: one stack per environment (README.md).
import * as pulumi from "@pulumi/pulumi";

import { environment } from "../src/environment.ts";
import { importExisting } from "../src/imports.ts";
import { EnvironmentSettingsSchema, readSettings } from "../src/settings.ts";

importExisting();

const settings = readSettings(EnvironmentSettingsSchema, [
  "accountId",
  "accountStack",
  "domain",
  "environment",
  "hostnames",
  "zoneId",
]);

const shared = new pulumi.StackReference(settings.accountStack);

const made = environment(settings, {
  owner: shared.requireOutput("ownerPolicyId").apply(String),
  publicCallbacks: shared
    .requireOutput("publicCallbacksPolicyId")
    .apply(String),
});

export const { accessAud, backupBucket, mediaBucket, r2Endpoint, tunnelId } =
  made;
