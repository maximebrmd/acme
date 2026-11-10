import * as cloudflare from "@pulumi/cloudflare";
import * as pulumi from "@pulumi/pulumi";

import type { EnvironmentSettings } from "./settings.ts";

/**
 * The paths that outside services call on an environment behind Access
 * throughout, which a Bypass policy opens: Bluesky reads the OAuth client
 * metadata, Stripe posts its events, Meta its data deletion requests. The
 * Ansible project's peal_access_bypass_paths routes the same paths.
 */
const publicCallbackPaths = [
  "api/channels/oauth",
  "api/auth/stripe/webhook",
  "api/data-deletion",
] as const;

/** Browsers upload media straight to the bucket (peal-server:media-cors). */
const uploadRule = (origin: string) => ({
  allowed: {
    headers: ["content-type", "if-none-match"],
    methods: ["PUT"],
    origins: [origin],
  },
  maxAgeSeconds: 3600,
});

const abortIncompleteUploads = (days: number) => ({
  abortMultipartUploadsTransition: {
    condition: { maxAge: days * 86_400, type: "Age" },
  },
  conditions: { prefix: "" },
  enabled: true,
});

export interface Environment {
  /** Every resource made, by kind, for the tests and the outputs. */
  readonly resources: {
    readonly applications: readonly cloudflare.ZeroTrustAccessApplication[];
    readonly buckets: readonly cloudflare.R2Bucket[];
    readonly cors: cloudflare.R2BucketCors;
    readonly lifecycles: readonly cloudflare.R2BucketLifecycle[];
    readonly records: readonly cloudflare.DnsRecord[];
    readonly tunnel: cloudflare.ZeroTrustTunnelCloudflared;
  };
  readonly accessAud: {
    readonly app: pulumi.Output<string>;
    readonly grafana: pulumi.Output<string>;
    readonly ssh: pulumi.Output<string>;
  };
  readonly backupBucket: pulumi.Output<string>;
  readonly mediaBucket: pulumi.Output<string>;
  readonly r2Endpoint: string;
  readonly tunnelId: pulumi.Output<string>;
}

export interface AccessPolicies {
  readonly owner: pulumi.Input<string>;
  readonly publicCallbacks: pulumi.Input<string>;
}

/**
 * One environment of Peal at Cloudflare: its tunnel and the host names that
 * point to it, its Access applications, and its buckets in R2's EU
 * jurisdiction. The tunnel's token, the buckets' keys and the rest of the
 * vault stay out of here (packages/peal-infra/ansible, "Credentials").
 */
export const environment = (
  settings: EnvironmentSettings,
  policies: AccessPolicies
): Environment => {
  const { accountId, domain, environment: name, hostnames, zoneId } = settings;

  if (name !== "sandbox") {
    // Production is public, with Access on its admin paths alone: its
    // applications come with its stack.
    throw new Error(`The ${name} environment is not described yet`);
  }

  const host = (subdomain: string) => `${subdomain}.${domain}`;
  const title = `Peal ${name}`;

  // Locally managed: cloudflared reads its routes from config.yml, which the
  // Ansible project writes, not from Cloudflare.
  const tunnel = new cloudflare.ZeroTrustTunnelCloudflared("tunnel", {
    accountId,
    configSrc: "local",
    name: `peal-${name}`,
  });

  const records = Object.entries(hostnames).map(
    ([key, subdomain]) =>
      new cloudflare.DnsRecord(`hostname-${key}`, {
        content: pulumi.interpolate`${tunnel.id}.cfargotunnel.com`,
        name: host(subdomain),
        proxied: true,
        ttl: 1,
        type: "CNAME",
        zoneId,
      })
  );

  const application = (
    resourceName: string,
    applicationName: string,
    uris: readonly string[],
    policyId: pulumi.Input<string>
  ) =>
    new cloudflare.ZeroTrustAccessApplication(resourceName, {
      accountId,
      destinations: uris.map((uri) => ({ type: "public", uri })),
      domain: uris[0] ?? "",
      name: applicationName,
      policies: [{ id: policyId, precedence: 1 }],
      sessionDuration: "24h",
      type: "self_hosted",
    });

  const app = application(
    "access-app",
    title,
    [host(hostnames.app), host(hostnames.site), host(hostnames.docs)],
    policies.owner
  );

  const callbacks = application(
    "access-callbacks",
    `${title} callbacks`,
    publicCallbackPaths.map((path) => `${host(hostnames.app)}/${path}`),
    policies.publicCallbacks
  );

  const grafana = application(
    "access-grafana",
    `${title} Grafana`,
    [host(hostnames.grafana)],
    policies.owner
  );

  const ssh = application(
    "access-ssh",
    `${title} SSH`,
    [host(hostnames.ssh)],
    policies.owner
  );

  const bucket = (kind: "media" | "backups") =>
    new cloudflare.R2Bucket(`bucket-${kind}`, {
      accountId,
      jurisdiction: "eu",
      name: `peal-${name}-${kind}`,
    });

  const media = bucket("media");
  const backups = bucket("backups");

  const mediaLifecycle = new cloudflare.R2BucketLifecycle("lifecycle-media", {
    accountId,
    bucketName: media.name,
    jurisdiction: "eu",
    rules: [
      { ...abortIncompleteUploads(1), id: "abort-incomplete-uploads" },
      {
        // The erasure ledger, which the server prunes itself: a second
        // guard. Its prefix must stay exactly erasures/.
        conditions: { prefix: "erasures/" },
        deleteObjectsTransition: {
          condition: { maxAge: 42 * 86_400, type: "Age" },
        },
        enabled: true,
        id: "expire-erasures",
      },
    ],
  });

  // Never an expiry on the backups: pgBackRest keeps its own retention.
  const backupLifecycle = new cloudflare.R2BucketLifecycle(
    "lifecycle-backups",
    {
      accountId,
      bucketName: backups.name,
      jurisdiction: "eu",
      rules: [
        { ...abortIncompleteUploads(7), id: "Default Multipart Abort Rule" },
      ],
    }
  );

  const cors = new cloudflare.R2BucketCors("cors-media", {
    accountId,
    bucketName: media.name,
    jurisdiction: "eu",
    rules: [uploadRule(`https://${host(hostnames.app)}`)],
  });

  return {
    accessAud: { app: app.aud, grafana: grafana.aud, ssh: ssh.aud },
    backupBucket: backups.name,
    mediaBucket: media.name,
    r2Endpoint: `https://${accountId}.eu.r2.cloudflarestorage.com`,
    resources: {
      applications: [app, callbacks, grafana, ssh],
      buckets: [media, backups],
      cors,
      lifecycles: [mediaLifecycle, backupLifecycle],
      records,
      tunnel,
    },
    tunnelId: tunnel.id,
  };
};
