import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import { environment } from "../src/environment.ts";
import type { EnvironmentSettings } from "../src/settings.ts";
import { input, recordResources, valueOf } from "./support.ts";

const made = await recordResources();

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
  zoneId: "zone-synthetic",
};

const result = environment(sandbox, {
  owner: "owner-policy",
  publicCallbacks: "callbacks-policy",
});

const ofType = (type: string) =>
  made.filter((resource) => resource.type === type);

describe("the sandbox at Cloudflare", () => {
  it("points each host name at its locally managed tunnel, proxied", async () => {
    await valueOf(result.tunnelId);

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
    ]);

    for (const record of records) {
      expect(record.inputs).toMatchObject({
        content: "tunnel-id.cfargotunnel.com",
        proxied: true,
        type: "CNAME",
      });
    }
  });

  it("keeps every host name behind the owner's policy, but the callbacks", async () => {
    await valueOf(result.accessAud.app);

    const applications = ofType(
      "cloudflare:index/zeroTrustAccessApplication:ZeroTrustAccessApplication"
    );

    const policyOf = (name: string) =>
      input(
        applications.find((application) => application.name === name),
        "policies",
        PoliciesSchema
      );

    for (const name of ["access-app", "access-grafana", "access-ssh"]) {
      expect(policyOf(name)).toStrictEqual([
        { id: "owner-policy", precedence: 1 },
      ]);
    }

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

  it("keeps the buckets in the EU, and never expires a backup", async () => {
    await valueOf(result.backupBucket);

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
    await valueOf(result.mediaBucket);
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

  it("describes no other environment yet", () => {
    expect(() =>
      environment(
        { ...sandbox, environment: "production" },
        { owner: "o", publicCallbacks: "c" }
      )
    ).toThrow("not described yet");
  });
});
