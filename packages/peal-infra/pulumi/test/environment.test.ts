import { createHash } from "node:crypto";

import * as pulumi from "@pulumi/pulumi";
import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import { PealEnvironment } from "../src/environment.ts";
import type { EnvironmentSettings } from "../src/settings.ts";
import { sandboxResources } from "./sandbox-resources.ts";
import { input, recordResources, valueOf } from "./support.ts";

const made = await recordResources();

const decodeResources = Schema.decodeUnknownSync(
  Schema.fromJsonString(Schema.Record(Schema.String, Schema.String))
);

const PoliciesSchema = Schema.Array(
  Schema.Struct({ id: Schema.String, precedence: Schema.Number })
);

const DestinationsSchema = Schema.Array(
  Schema.Struct({ type: Schema.String, uri: Schema.String })
);

const sandbox: EnvironmentSettings = {
  accountId: "account-synthetic",
  accountStack: "organization/peal-account/peal",
  domain: "example.test",
  environment: "sandbox",
  hostnames: {
    app: "sandbox",
    docs: "sandbox-docs",
    grafana: "sandbox-grafana",
    site: "sandbox-site",
    ssh: "sandbox-ssh",
  },
  shortLinkHost: "sandbox.short.test",
  zoneId: "zone-synthetic",
};

const result = new PealEnvironment(
  "environment",
  sandbox,
  { owner: "owner-policy", publicCallbacks: "callbacks-policy" },
  "link-zone-synthetic"
);

const ofType = (type: string) =>
  made.filter((resource) => resource.type === type);

describe("the sandbox at Cloudflare", () => {
  it("points each host name at its locally managed tunnel, proxied", async () => {
    await valueOf(result.tunnel.id);

    const [tunnel] = ofType(
      "cloudflare:index/zeroTrustTunnelCloudflared:ZeroTrustTunnelCloudflared"
    );

    expect(tunnel?.inputs).toMatchObject({
      configSrc: "local",
      name: "peal-sandbox",
    });
    const records = ofType("cloudflare:index/dnsRecord:DnsRecord");
    expect(
      records
        .map((record) => input(record, "name", Schema.String))
        .toSorted((left, right) => left.localeCompare(right))
    ).toStrictEqual([
      "sandbox-docs.example.test",
      "sandbox-grafana.example.test",
      "sandbox-site.example.test",
      "sandbox-ssh.example.test",
      "sandbox.example.test",
      "sandbox.short.test",
    ]);

    for (const record of records) {
      expect(record.inputs).toMatchObject({
        content: "tunnel-id.cfargotunnel.com",
        proxied: true,
        type: "CNAME",
      });
    }

    const zoneOf = (name: string) =>
      input(
        records.find((record) => record.name === name),
        "zoneId",
        Schema.String
      );

    expect(zoneOf("hostname-app")).toBe("zone-synthetic");
    expect(zoneOf("hostname-short-links")).toBe("link-zone-synthetic");
  });

  it("keeps every host name behind the owner's policy, but the callbacks", async () => {
    await valueOf(pulumi.output(result.accessAud));

    const applications = ofType(
      "cloudflare:index/zeroTrustAccessApplication:ZeroTrustAccessApplication"
    );

    const policyOf = (name: string) =>
      input(
        applications.find((application) => application.name === name),
        "policies",
        PoliciesSchema
      );

    // The app's second policy is the uptime server's, below.
    expect(policyOf("access-app")[0]).toStrictEqual({
      id: "owner-policy",
      precedence: 1,
    });

    for (const name of ["access-grafana", "access-ssh"]) {
      expect(policyOf(name)).toStrictEqual([
        { id: "owner-policy", precedence: 1 },
      ]);
    }

    // Short links stay behind Access on the sandbox, as the rest of it.
    expect(
      input(
        applications.find((application) => application.name === "access-app"),
        "destinations",
        DestinationsSchema
      ).map((destination) => destination.uri)
    ).toStrictEqual([
      "sandbox.example.test",
      "sandbox-site.example.test",
      "sandbox-docs.example.test",
      "sandbox.short.test",
    ]);

    expect(policyOf("access-callbacks")).toStrictEqual([
      { id: "callbacks-policy", precedence: 1 },
    ]);

    const callbacks = applications.find(
      (application) => application.name === "access-callbacks"
    );

    expect(input(callbacks, "destinations", DestinationsSchema)).toStrictEqual([
      { type: "public", uri: "sandbox.example.test/api/channels/oauth" },
      { type: "public", uri: "sandbox.example.test/api/auth/stripe/webhook" },
      { type: "public", uri: "sandbox.example.test/api/data-deletion" },
    ]);
  });

  it("lets the uptime server's checks into the app, the site and the docs alone", async () => {
    await valueOf(pulumi.output(result.accessAud));

    const applications = ofType(
      "cloudflare:index/zeroTrustAccessApplication:ZeroTrustAccessApplication"
    );

    const app = applications.find(
      (application) => application.name === "access-app"
    );

    // The owner's policy first, as before: adding the second updates the
    // application in place, whose name and destinations stay.
    expect(input(app, "policies", PoliciesSchema)).toStrictEqual([
      { id: "owner-policy", precedence: 1 },
      { id: "uptime-service-auth-id", precedence: 2 },
    ]);
    expect(app?.inputs).toMatchObject({
      domain: "sandbox.example.test",
      name: "Peal sandbox",
    });

    for (const application of applications.filter(
      (other) => other.name !== "access-app"
    )) {
      expect(
        input(application, "policies", PoliciesSchema).map(
          (policy) => policy.id
        )
      ).not.toContain("uptime-service-auth-id");
    }

    // Service Auth, for the one token, by its id: never any service token.
    const policies = ofType(
      "cloudflare:index/zeroTrustAccessPolicy:ZeroTrustAccessPolicy"
    );

    expect(policies.map((policy) => policy.name)).toStrictEqual([
      "uptime-service-auth",
    ]);
    expect(policies[0]?.inputs).toMatchObject({
      decision: "non_identity",
      includes: [{ serviceToken: { tokenId: "uptime-token-id" } }],
    });

    const tokens = ofType(
      "cloudflare:index/zeroTrustAccessServiceToken:ZeroTrustAccessServiceToken"
    );

    expect(tokens.map((token) => token.inputs)).toStrictEqual([
      {
        accountId: "account-synthetic",
        duration: "8760h",
        name: "Peal sandbox uptime checks",
      },
    ]);
  });

  it("gives the uptime server's token as secrets", async () => {
    const { uptimeAccessToken } = result;
    expect(uptimeAccessToken).toBeDefined();

    const token = uptimeAccessToken ?? {
      clientId: pulumi.output(""),
      clientSecret: pulumi.output(""),
    };

    await expect(valueOf(token.clientId)).resolves.toBe(
      "uptime-token-client-id.access"
    );
    await expect(valueOf(token.clientSecret)).resolves.toBe(
      "uptime-token-client-secret-synthetic"
    );
    await expect(pulumi.isSecret(token.clientId)).resolves.toBeTruthy();
    await expect(pulumi.isSecret(token.clientSecret)).resolves.toBeTruthy();
  });

  it("keeps the buckets in the EU, and never expires a backup", async () => {
    await valueOf(result.buckets.backups.name);

    for (const bucket of ofType("cloudflare:index/r2Bucket:R2Bucket")) {
      expect(input(bucket, "jurisdiction", Schema.String)).toBe("eu");
    }

    const lifecycles = ofType(
      "cloudflare:index/r2BucketLifecycle:R2BucketLifecycle"
    );

    const backups = lifecycles.find(
      (lifecycle) => lifecycle.name === "lifecycle-backups"
    );

    expect(JSON.stringify(backups?.inputs)).not.toContain(
      "deleteObjectsTransition"
    );

    const media = lifecycles.find(
      (lifecycle) => lifecycle.name === "lifecycle-media"
    );

    expect(JSON.stringify(media?.inputs)).toContain('"prefix":"erasures/"');
  });

  it("lets browsers upload to the media bucket from the app alone", async () => {
    await valueOf(result.buckets.media.name);
    const [cors] = ofType("cloudflare:index/r2BucketCors:R2BucketCors");
    expect(input(cors, "rules", Schema.Unknown)).toStrictEqual([
      {
        allowed: {
          headers: ["content-type", "if-none-match"],
          methods: ["PUT"],
          origins: ["https://sandbox.example.test"],
        },
        maxAgeSeconds: 3600,
      },
    ]);
  });

  it("gives each bucket a key that reaches it alone", async () => {
    const accessKeyId = await valueOf(result.keys.media.accessKeyId);
    const secretAccessKey = await valueOf(result.keys.media.secretAccessKey);
    expect(accessKeyId).toBe("key-media-id");
    expect(secretAccessKey).toBe(
      createHash("sha256").update("key-media-value").digest("hex")
    );
    const tokens = ofType("cloudflare:index/accountToken:AccountToken");

    const reach = (name: string) =>
      input(
        tokens.find((token) => token.name === name),
        "policies",
        Schema.Array(Schema.Struct({ resources: Schema.String }))
      ).map((policy) => Object.keys(decodeResources(policy.resources)));

    expect(reach("key-media")).toStrictEqual([
      ["com.cloudflare.edge.r2.bucket.account-synthetic_eu_peal-sandbox-media"],
    ]);
    expect(reach("key-backups")).toStrictEqual([
      [
        "com.cloudflare.edge.r2.bucket.account-synthetic_eu_peal-sandbox-backups",
      ],
    ]);
  });

  it("makes every resource as the applied sandbox has it", async () => {
    await valueOf(
      pulumi.all([
        result.cors.id,
        result.keys.backups.accessKeyId,
        result.keys.media.accessKeyId,
        ...result.applications.map((application) => application.id),
        ...result.records.map((record) => record.id),
      ])
    );

    expect(
      made
        .map(({ inputs, name, type }) => ({ inputs, name, type }))
        .toSorted((left, right) => left.name.localeCompare(right.name))
    ).toStrictEqual(sandboxResources);
  });

  it("keeps every resource under the component, at its URN", async () => {
    await expect(valueOf(result.urn)).resolves.toBe(
      "urn:pulumi:test::peal::peal:cloudflare:Environment::environment"
    );
    await expect(valueOf(result.tunnel.urn)).resolves.toBe(
      "urn:pulumi:test::peal::peal:cloudflare:Environment$cloudflare:index/zeroTrustTunnelCloudflared:ZeroTrustTunnelCloudflared::tunnel"
    );
    await expect(valueOf(result.buckets.media.urn)).resolves.toBe(
      "urn:pulumi:test::peal::peal:cloudflare:Environment$cloudflare:index/r2Bucket:R2Bucket::bucket-media"
    );
  });

  it("gives the tunnel's token as a secret", async () => {
    await expect(valueOf(result.tunnelToken)).resolves.toBe("tunnel-token");
    await expect(pulumi.isSecret(result.tunnelToken)).resolves.toBeTruthy();
  });
});
