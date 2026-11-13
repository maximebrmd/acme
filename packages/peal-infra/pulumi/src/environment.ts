import { createHash } from "node:crypto";

import * as cloudflare from "@pulumi/cloudflare";
import * as pulumi from "@pulumi/pulumi";

import type { EnvironmentSettings } from "./settings.ts";

/**
 * The paths that outside services call on an environment behind Access
 * throughout, which a Bypass policy opens: Bluesky reads the OAuth client
 * metadata, Stripe posts its events and its meter error events, Meta its
 * data deletion requests. The
 * Ansible project's peal_access_bypass_paths routes the same paths.
 */
const publicCallbackPaths = [
  "api/channels/oauth",
  "api/auth/stripe/webhook",
  "api/stripe/meter-errors",
  "api/data-deletion",
] as const;

/**
 * The paths of the app's host name that Access guards on an environment
 * otherwise public (production): Better Auth's admin endpoints, the staff
 * console's API, and its pages, under /en and /fr too. The Ansible
 * project's peal_access_paths routes the same paths, and cloudflared checks
 * this application's token on them: a path added there is added here, and
 * a locale added to the web app (src/i18n/routing.ts) adds its /<locale>/admin
 * to both. The Ansible project's tests/test_cloudflared.py reads this list
 * and fails when the three disagree.
 */
const adminPaths = [
  "api/auth/admin",
  "api/admin",
  "admin",
  "en/admin",
  "fr/admin",
] as const;

/**
 * How long the uptime server's service token is valid: a year, in hours.
 * Renewed before it ends with the dashboard's Refresh, which keeps its id
 * and secret (README.md, "The uptime server").
 */
const uptimeTokenDuration = "8760h";

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

/**
 * The Access service token the uptime server's checks of an environment
 * behind Access carry (CF-Access-Client-Id and CF-Access-Client-Secret).
 */
export interface ServiceToken {
  readonly clientId: pulumi.Output<string>;
  readonly clientSecret: pulumi.Output<string>;
  readonly expiresAt: pulumi.Output<string>;
}

/** A bucket's S3 key: an account token limited to reading and writing it. */
export interface BucketKey {
  readonly accessKeyId: pulumi.Output<string>;
  readonly secretAccessKey: pulumi.Output<string>;
}

/**
 * The account stack's Access policies: the owner's, and the Bypass policy
 * an environment behind Access throughout puts on its callbacks.
 */
export interface AccessPolicies {
  readonly owner: pulumi.Input<string>;
  readonly publicCallbacks: pulumi.Input<string>;
}

type Kind = "media" | "backups";

type Audiences = Readonly<Record<"grafana" | "ssh", pulumi.Output<string>>>;

/**
 * The audience tags of an environment's Access applications: `app` on an
 * environment behind Access throughout (the sandbox), `admin` on one that
 * is public but for its admin (production). The Ansible project's
 * scripts/cloudflare_from_pulumi.py reads them by these names, and maps
 * them onto the inventory's (cloudflare_access_aud).
 */
export type AccessAud =
  | (Audiences & { readonly app: pulumi.Output<string> })
  | (Audiences & { readonly admin: pulumi.Output<string> });

/**
 * One environment of Peal at Cloudflare: its tunnel and the host names that
 * point to it, its Access applications, and its buckets in R2's EU
 * jurisdiction, each with a key of its own. The tunnel's token and the
 * keys are the stack's secret outputs, which the Ansible project's
 * scripts/cloudflare_from_pulumi.py writes into the environment's vault.
 */
export class PealEnvironment extends pulumi.ComponentResource {
  readonly accessAud: AccessAud;
  readonly applications: readonly cloudflare.ZeroTrustAccessApplication[];
  readonly buckets: Readonly<Record<Kind, cloudflare.R2Bucket>>;
  readonly cors: cloudflare.R2BucketCors;
  readonly keys: Readonly<Record<Kind, BucketKey>>;
  readonly r2Endpoint: string;
  readonly records: readonly cloudflare.DnsRecord[];
  readonly tunnel: cloudflare.ZeroTrustTunnelCloudflared;
  readonly tunnelToken: pulumi.Output<string>;
  // The sandbox's alone: production's checks are public.
  readonly uptimeAccessToken: ServiceToken | undefined;

  constructor(
    name: string,
    settings: EnvironmentSettings,
    policies: AccessPolicies,
    linkZoneId: pulumi.Input<string>,
    options?: pulumi.ComponentResourceOptions
  ) {
    super("peal:cloudflare:Environment", name, {}, options);

    const {
      accountId,
      domain,
      environment: env,
      hostnames,
      shortLinkHost,
      zoneId,
    } = settings;

    // The sandbox is behind Access throughout, but for what outside
    // services call; production is public, with Access on its admin alone
    // (the Ansible project's peal_access_everything).
    const behindAccess = env === "sandbox";

    // `@` is the bare domain, which Cloudflare flattens as a proxied CNAME.
    const host = (label: string) =>
      label === "@" ? domain : `${label}.${domain}`;

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

    const toTunnel = (
      key: string,
      hostname: string,
      zone: pulumi.Input<string>
    ) =>
      new cloudflare.DnsRecord(
        `hostname-${key}`,
        {
          content: pulumi.interpolate`${this.tunnel.id}.cfargotunnel.com`,
          name: hostname,
          proxied: true,
          ttl: 1,
          type: "CNAME",
          zoneId: zone,
        },
        child(true)
      );

    // Short links are on a zone of their own, whose rules (src/link-domain.ts)
    // rewrite /<code> to the server's /api/l/<code> on the way.
    this.records = [
      ...Object.entries(hostnames).map(([key, label]) =>
        toTunnel(key, host(label), zoneId)
      ),
      toTunnel("short-links", shortLinkHost, linkZoneId),
    ];

    // The policies apply in their order: the owner's first.
    const application = (
      resourceName: string,
      applicationName: string,
      uris: readonly string[],
      ...policyIds: readonly [pulumi.Input<string>, ...pulumi.Input<string>[]]
    ) =>
      new cloudflare.ZeroTrustAccessApplication(
        resourceName,
        {
          accountId,
          destinations: uris.map((uri) => ({ type: "public", uri })),
          domain: uris[0] ?? "",
          name: applicationName,
          policies: policyIds.map((id, index) => ({
            id,
            precedence: index + 1,
          })),
          sessionDuration: "24h",
          type: "self_hosted",
        },
        child(false)
      );

    const grafana = () =>
      application(
        "access-grafana",
        `${title} Grafana`,
        [host(hostnames.grafana)],
        policies.owner
      );

    const ssh = () =>
      application(
        "access-ssh",
        `${title} SSH`,
        [host(hostnames.ssh)],
        policies.owner
      );

    if (behindAccess) {
      // The uptime server's checks of the app, the site, the docs and the
      // short links (the Ansible project's README, "Uptime"): a token of
      // their own, and a Service Auth policy that lets it in alone, on
      // this application and no other.
      const uptimeToken = new cloudflare.ZeroTrustAccessServiceToken(
        "uptime-token",
        {
          accountId,
          duration: uptimeTokenDuration,
          name: `${title} uptime checks`,
        },
        { parent: this }
      );

      const uptimePolicy = new cloudflare.ZeroTrustAccessPolicy(
        "uptime-service-auth",
        {
          accountId,
          decision: "non_identity",
          includes: [{ serviceToken: { tokenId: uptimeToken.id } }],
          name: `${title} uptime checks`,
        },
        { parent: this }
      );

      this.uptimeAccessToken = {
        clientId: pulumi.secret(uptimeToken.clientId),
        clientSecret: pulumi.secret(uptimeToken.clientSecret),
        expiresAt: uptimeToken.expiresAt,
      };

      const app = application(
        "access-app",
        title,
        [
          host(hostnames.app),
          host(hostnames.site),
          host(hostnames.docs),
          // The sandbox's short links stay behind Access with the rest of
          // it: a tester signed in follows them.
          shortLinkHost,
        ],
        policies.owner,
        uptimePolicy.id
      );

      const callbacks = application(
        "access-callbacks",
        `${title} callbacks`,
        publicCallbackPaths.map((path) => `${host(hostnames.app)}/${path}`),
        policies.publicCallbacks
      );

      const [grafanaApp, sshApp] = [grafana(), ssh()];
      this.applications = [app, callbacks, grafanaApp, sshApp];
      this.accessAud = {
        app: app.aud,
        grafana: grafanaApp.aud,
        ssh: sshApp.aud,
      };
    } else {
      // The app, the site, the docs and the short links are public: no
      // application covers them.
      const admin = application(
        "access-admin",
        `${title} admin`,
        adminPaths.map((path) => `${host(hostnames.app)}/${path}`),
        policies.owner
      );

      const [grafanaApp, sshApp] = [grafana(), ssh()];
      this.applications = [admin, grafanaApp, sshApp];
      this.uptimeAccessToken = undefined;
      this.accessAud = {
        admin: admin.aud,
        grafana: grafanaApp.aud,
        ssh: sshApp.aud,
      };
    }

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
