// The environment project: one stack per environment (README.md).
import * as pulumi from "@pulumi/pulumi";

import { PealEnvironment } from "../src/environment.ts";
import { importExisting } from "../src/imports.ts";
import { EnvironmentSettingsSchema, readSettings } from "../src/settings.ts";

importExisting();

const settings = readSettings(EnvironmentSettingsSchema, [
  "accountId",
  "accountStack",
  "domain",
  "environment",
  "hostnames",
  "shortLinkHost",
  "zoneId",
]);

const shared = new pulumi.StackReference(settings.accountStack);

const made = new PealEnvironment(
  "environment",
  settings,
  {
    owner: shared.requireOutput("ownerPolicyId").apply(String),
    publicCallbacks: shared
      .requireOutput("publicCallbacksPolicyId")
      .apply(String),
  },
  shared.requireOutput("linkZoneId").apply(String)
);

export const { accessAud, r2Endpoint, tunnelToken } = made;
export const tunnelId = made.tunnel.id;
export const mediaBucket = made.buckets.media.name;
export const backupBucket = made.buckets.backups.name;

// The buckets' keys, secret: scripts/cloudflare_from_pulumi.py in the
// Ansible project writes them into the environment's vault.
export const mediaKey = made.keys.media;
export const backupKey = made.keys.backups;

// The sandbox's alone: the service token the uptime server's checks carry,
// secret, which scripts/cloudflare_from_pulumi.py in the Ansible project
// writes into the uptime server's vault; and when it ends, in clear.
export const uptimeAccessToken =
  made.uptimeAccessToken === undefined
    ? undefined
    : {
        clientId: made.uptimeAccessToken.clientId,
        clientSecret: made.uptimeAccessToken.clientSecret,
      };

export const uptimeAccessTokenExpiresAt = made.uptimeAccessToken?.expiresAt;
