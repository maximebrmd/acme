import { createHash } from "node:crypto";

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

/** Cloudflare's permission group "Workers R2 Storage Bucket Item Write". */
const bucketItemWrite = "2efd5506f9c8494dacb1fa10a3e7d5b6";

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

/** A bucket's S3 key: an account token limited to reading and writing it. */
export interface BucketKey {
  readonly accessKeyId: pulumi.Output<string>;
  readonly secretAccessKey: pulumi.Output<string>;
}

export interface AccessPolicies {
  readonly owner: pulumi.Input<string>;
  readonly publicCallbacks: pulumi.Input<string>;
}

type Kind = "media" | "backups";

/**
 * One environment of Peal at Cloudflare: its tunnel and the host names that
 * point to it, its Access applications, and its buckets in R2's EU
 * jurisdiction, each with a key of its own. The tunnel's token and the
 * keys are the stack's secret outputs, which the Ansible project's
 * scripts/cloudflare_from_pulumi.py writes into the environment's vault.
 */
export class PealEnvironment extends pulumi.ComponentResource {
  readonly accessAud: {
    readonly app: pulumi.Output<string>;
    readonly grafana: pulumi.Output<string>;
    readonly ssh: pulumi.Output<string>;
  };
  readonly applications: readonly cloudflare.ZeroTrustAccessApplication[];
  readonly buckets: Readonly<Record<Kind, cloudflare.R2Bucket>>;
  readonly cors: cloudflare.R2BucketCors;
  readonly keys: Readonly<Record<Kind, BucketKey>>;
  readonly r2Endpoint: string;
  readonly records: readonly cloudflare.DnsRecord[];
  readonly tunnel: cloudflare.ZeroTrustTunnelCloudflared;
  readonly tunnelToken: pulumi.Output<string>;

  constructor(
    name: string,
    settings: EnvironmentSettings,
    policies: AccessPolicies,
    options?: pulumi.ComponentResourceOptions
  ) {
    super("peal:cloudflare:Environment", name, {}, options);

    const { accountId, domain, environment: env, hostnames, zoneId } = settings;

    if (env !== "sandbox") {
      // Production is public, with Access on its admin paths alone: its
      // applications come with its stack.
      throw new Error(`The ${env} environment is not described yet`);
    }

    const host = (subdomain: string) => `${subdomain}.${domain}`;
    const title = `Peal ${env}`;

    // The resources were made at the stack's root before this component:
    // the alias keeps them, rather than making them again. What holds data
    // or routes traffic is protected from deletion.
    const child = (protect: boolean): pulumi.CustomResourceOptions => ({
      aliases: [{ parent: pulumi.rootStackResource }],
      parent: this,
      protect,
    });

    // Locally managed: cloudflared reads its routes from config.yml, which
    // the Ansible project writes, not from Cloudflare.
    this.tunnel = new cloudflare.ZeroTrustTunnelCloudflared(
      "tunnel",
      { accountId, configSrc: "local", name: `peal-${env}` },
      child(true)
    );
    this.tunnelToken = pulumi.secret(
      cloudflare
        .getZeroTrustTunnelCloudflaredTokenOutput(
          { accountId, tunnelId: this.tunnel.id },
          { parent: this }
        )
        .apply((result) => result.token)
    );

    this.records = Object.entries(hostnames).map(
      ([key, subdomain]) =>
        new cloudflare.DnsRecord(
          `hostname-${key}`,
          {
            content: pulumi.interpolate`${this.tunnel.id}.cfargotunnel.com`,
            name: host(subdomain),
            proxied: true,
            ttl: 1,
            type: "CNAME",
            zoneId,
          },
          child(true)
        )
    );

    const application = (
      resourceName: string,
      applicationName: string,
      uris: readonly string[],
      policyId: pulumi.Input<string>
    ) =>
      new cloudflare.ZeroTrustAccessApplication(
        resourceName,
        {
          accountId,
          destinations: uris.map((uri) => ({ type: "public", uri })),
          domain: uris[0] ?? "",
          name: applicationName,
          policies: [{ id: policyId, precedence: 1 }],
          sessionDuration: "24h",
          type: "self_hosted",
        },
        child(false)
      );

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

    this.applications = [app, callbacks, grafana, ssh];
    this.accessAud = { app: app.aud, grafana: grafana.aud, ssh: ssh.aud };

    // A bucket outlives its resource: removing it from here leaves it, and
    // its data, at Cloudflare.
    const bucket = (kind: Kind) =>
      new cloudflare.R2Bucket(
        `bucket-${kind}`,
        { accountId, jurisdiction: "eu", name: `peal-${env}-${kind}` },
        { ...child(true), retainOnDelete: true }
      );

    this.buckets = { backups: bucket("backups"), media: bucket("media") };

    // An R2 key is an account token: its id is the access key id, the
    // SHA-256 of its value the secret access key.
    const key = (kind: Kind): BucketKey => {
      const token = new cloudflare.AccountToken(
        `key-${kind}`,
        {
          accountId,
          name: `peal-${env}-${kind}-key`,
          policies: [
            {
              effect: "allow",
              permissionGroups: [{ id: bucketItemWrite }],
              resources: JSON.stringify({
                [`com.cloudflare.edge.r2.bucket.${accountId}_eu_peal-${env}-${kind}`]:
                  "*",
              }),
            },
          ],
        },
        { dependsOn: [this.buckets[kind]], parent: this }
      );

      return {
        accessKeyId: token.id,
        secretAccessKey: pulumi.secret(
          token.value.apply((value) =>
            createHash("sha256").update(value).digest("hex")
          )
        ),
      };
    };

    this.keys = { backups: key("backups"), media: key("media") };

    const lifecycle = (
      kind: Kind,
      rules: cloudflare.R2BucketLifecycleArgs["rules"]
    ) =>
      new cloudflare.R2BucketLifecycle(
        `lifecycle-${kind}`,
        {
          accountId,
          bucketName: this.buckets[kind].name,
          jurisdiction: "eu",
          rules,
        },
        child(false)
      );

    lifecycle("media", [
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
    ]);
    // Never an expiry on the backups: pgBackRest keeps its own retention.
    lifecycle("backups", [
      { ...abortIncompleteUploads(7), id: "Default Multipart Abort Rule" },
    ]);
    this.cors = new cloudflare.R2BucketCors(
      "cors-media",
      {
        accountId,
        bucketName: this.buckets.media.name,
        jurisdiction: "eu",
        rules: [uploadRule(`https://${host(hostnames.app)}`)],
      },
      child(false)
    );

    this.r2Endpoint = `https://${accountId}.eu.r2.cloudflarestorage.com`;
    this.registerOutputs({
      accessAud: this.accessAud,
      r2Endpoint: this.r2Endpoint,
      tunnelId: this.tunnel.id,
    });
  }
}
