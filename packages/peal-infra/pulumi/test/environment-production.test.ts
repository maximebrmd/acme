import * as pulumi from "@pulumi/pulumi";
import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import { PealEnvironment } from "../src/environment.ts";
import type { EnvironmentSettings } from "../src/settings.ts";
import { input, recordResources, valueOf } from "./support.ts";

const made = await recordResources();

const PoliciesSchema = Schema.Array(
  Schema.Struct({ id: Schema.String, precedence: Schema.Number })
);

const DestinationsSchema = Schema.Array(
  Schema.Struct({ type: Schema.String, uri: Schema.String })
);

const production: EnvironmentSettings = {
  accountId: "account-synthetic",
  accountStack: "organization/peal-account/peal",
  domain: "example.test",
  environment: "production",
  hostnames: {
    app: "app",
    docs: "docs",
    grafana: "grafana",
    site: "@",
    ssh: "ssh",
  },
  shortLinkHost: "short.test",
  zoneId: "zone-synthetic",
};

const result = new PealEnvironment(
  "environment",
  production,
  { owner: "owner-policy", publicCallbacks: "callbacks-policy" },
  "link-zone-synthetic"
);

// Every resource the component makes, once the mocks have seen it.
const settled = Promise.all([
  valueOf(pulumi.output(result.accessAud)),
  valueOf(
    pulumi.all([
      result.cors.id,
      result.keys.backups.accessKeyId,
      result.keys.media.accessKeyId,
      ...result.records.map((record) => record.id),
    ])
  ),
]);

// In the order of their names: the mocks see resources as they come.
const ofType = (type: string) =>
  made
    .filter((resource) => resource.type === type)
    .toSorted((left, right) => left.name.localeCompare(right.name));

const applications = () =>
  ofType(
    "cloudflare:index/zeroTrustAccessApplication:ZeroTrustAccessApplication"
  );

const destinationsOf = (name: string) =>
  input(
    applications().find((application) => application.name === name),
    "destinations",
    DestinationsSchema
  ).map((destination) => destination.uri);

describe("production at Cloudflare", () => {
  it("has a locally managed tunnel of its own", async () => {
    await settled;

    const tunnels = ofType(
      "cloudflare:index/zeroTrustTunnelCloudflared:ZeroTrustTunnelCloudflared"
    );

    expect(tunnels.map((tunnel) => tunnel.inputs)).toStrictEqual([
      {
        accountId: "account-synthetic",
        configSrc: "local",
        name: "peal-production",
      },
    ]);
  });

  it("points the bare domain and each host name at the tunnel, proxied", async () => {
    await settled;
    const records = ofType("cloudflare:index/dnsRecord:DnsRecord");

    expect(
      records.map((record) => ({
        name: input(record, "name", Schema.String),
        zoneId: input(record, "zoneId", Schema.String),
      }))
    ).toStrictEqual([
      { name: "app.example.test", zoneId: "zone-synthetic" },
      { name: "docs.example.test", zoneId: "zone-synthetic" },
      { name: "grafana.example.test", zoneId: "zone-synthetic" },
      { name: "short.test", zoneId: "link-zone-synthetic" },
      { name: "example.test", zoneId: "zone-synthetic" },
      { name: "ssh.example.test", zoneId: "zone-synthetic" },
    ]);
    expect(records.map((record) => record.name)).toStrictEqual([
      "hostname-app",
      "hostname-docs",
      "hostname-grafana",
      "hostname-short-links",
      "hostname-site",
      "hostname-ssh",
    ]);

    for (const record of records) {
      expect(record.inputs).toMatchObject({
        content: "tunnel-id.cfargotunnel.com",
        proxied: true,
        ttl: 1,
        type: "CNAME",
      });
    }
  });

  it("guards the admin, Grafana and SSH alone, for the owner", async () => {
    await settled;

    expect(applications().map((application) => application.name)).toStrictEqual(
      ["access-admin", "access-grafana", "access-ssh"]
    );

    for (const application of applications()) {
      expect(input(application, "policies", PoliciesSchema)).toStrictEqual([
        { id: "owner-policy", precedence: 1 },
      ]);
      expect(application.inputs).toMatchObject({
        accountId: "account-synthetic",
        sessionDuration: "24h",
        type: "self_hosted",
      });
    }

    expect(
      applications().map((application) =>
        input(application, "name", Schema.String)
      )
    ).toStrictEqual([
      "Peal production admin",
      "Peal production Grafana",
      "Peal production SSH",
    ]);
    expect(destinationsOf("access-grafana")).toStrictEqual([
      "grafana.example.test",
    ]);
    expect(destinationsOf("access-ssh")).toStrictEqual(["ssh.example.test"]);
  });

  it("makes no service token: the uptime server's checks of it are public", async () => {
    await settled;

    expect(result.uptimeAccessToken).toBeUndefined();
    expect(
      made.filter((resource) =>
        [
          "cloudflare:index/zeroTrustAccessPolicy:ZeroTrustAccessPolicy",
          "cloudflare:index/zeroTrustAccessServiceToken:ZeroTrustAccessServiceToken",
        ].includes(resource.type)
      )
    ).toStrictEqual([]);
  });

  it("guards the admin's paths on the app, as the tunnel routes them", async () => {
    await settled;

    expect(destinationsOf("access-admin")).toStrictEqual([
      "app.example.test/api/auth/admin",
      "app.example.test/api/admin",
      "app.example.test/admin",
      "app.example.test/en/admin",
      "app.example.test/fr/admin",
    ]);
    expect(
      input(
        applications().find(
          (application) => application.name === "access-admin"
        ),
        "domain",
        Schema.String
      )
    ).toBe("app.example.test/api/auth/admin");
  });

  it("leaves the app, the site, the docs and the short links public", async () => {
    await settled;

    const guarded = applications().flatMap((application) =>
      destinationsOf(application.name)
    );

    for (const open of [
      "app.example.test",
      "example.test",
      "docs.example.test",
      "short.test",
    ]) {
      expect(guarded).not.toContain(open);
      expect(guarded.filter((uri) => uri.startsWith(`${open}/`))).toStrictEqual(
        open === "app.example.test"
          ? [
              "app.example.test/api/auth/admin",
              "app.example.test/api/admin",
              "app.example.test/admin",
              "app.example.test/en/admin",
              "app.example.test/fr/admin",
            ]
          : []
      );
    }
  });

  it("gives the audience tags the inventory names", async () => {
    const aud = await valueOf(pulumi.output(result.accessAud));

    expect(aud).toStrictEqual({
      admin: "access-admin-aud",
      grafana: "access-grafana-aud",
      ssh: "access-ssh-aud",
    });
  });

  it("keeps production's buckets in the EU, and never expires a backup", async () => {
    await settled;

    expect(
      ofType("cloudflare:index/r2Bucket:R2Bucket").map(
        (bucket) => bucket.inputs
      )
    ).toStrictEqual([
      {
        accountId: "account-synthetic",
        jurisdiction: "eu",
        name: "peal-production-backups",
      },
      {
        accountId: "account-synthetic",
        jurisdiction: "eu",
        name: "peal-production-media",
      },
    ]);

    const lifecycles = ofType(
      "cloudflare:index/r2BucketLifecycle:R2BucketLifecycle"
    );

    const backups = lifecycles.find(
      (lifecycle) => lifecycle.name === "lifecycle-backups"
    );

    expect(input(backups, "bucketName", Schema.String)).toBe(
      "peal-production-backups"
    );
    expect(JSON.stringify(backups?.inputs)).not.toContain(
      "deleteObjectsTransition"
    );
  });

  it("gives each bucket a key that reaches it alone", async () => {
    await settled;
    const tokens = ofType("cloudflare:index/accountToken:AccountToken");

    expect(
      tokens.map((token) => ({
        name: input(token, "name", Schema.String),
        resources: input(
          token,
          "policies",
          Schema.Array(Schema.Struct({ resources: Schema.String }))
        ).map((policy) => policy.resources),
      }))
    ).toStrictEqual([
      {
        name: "peal-production-backups-key",
        resources: [
          '{"com.cloudflare.edge.r2.bucket.account-synthetic_eu_peal-production-backups":"*"}',
        ],
      },
      {
        name: "peal-production-media-key",
        resources: [
          '{"com.cloudflare.edge.r2.bucket.account-synthetic_eu_peal-production-media":"*"}',
        ],
      },
    ]);
  });

  it("lets browsers upload to the media bucket from the app alone", async () => {
    await settled;
    const [cors] = ofType("cloudflare:index/r2BucketCors:R2BucketCors");

    expect(input(cors, "bucketName", Schema.String)).toBe(
      "peal-production-media"
    );
    expect(input(cors, "rules", Schema.Unknown)).toStrictEqual([
      {
        allowed: {
          headers: ["content-type", "if-none-match"],
          methods: ["PUT"],
          origins: ["https://app.example.test"],
        },
        maxAgeSeconds: 3600,
      },
    ]);
  });

  it("gives the tunnel's token as a secret", async () => {
    await expect(valueOf(result.tunnelToken)).resolves.toBe("tunnel-token");
    await expect(pulumi.isSecret(result.tunnelToken)).resolves.toBeTruthy();
  });
});
