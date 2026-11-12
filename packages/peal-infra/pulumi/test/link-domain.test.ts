import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import { PealLinkDomain } from "../src/link-domain.ts";
import { input, recordResources, valueOf } from "./support.ts";

const made = await recordResources();

const result = new PealLinkDomain("link", {
  accountId: "account-synthetic",
  domain: "example.test",
  linkDomain: "short.test",
});

const ofType = (type: string) =>
  made.filter((resource) => resource.type === type);

const named = (name: string) => made.find((resource) => resource.name === name);

const RulesSchema = Schema.Array(
  Schema.Struct({
    action: Schema.String,
    actionParameters: Schema.Unknown,
    expression: Schema.String,
  })
);

describe("the short-link domain", () => {
  it("adopts the zone the registrar made, and keeps it", async () => {
    await expect(valueOf(result.zoneId)).resolves.toBe("link-zone-id");

    const zones = ofType("cloudflare:index/zone:Zone");

    expect(zones).toHaveLength(1);
    expect(zones[0]?.inputs).toMatchObject({
      account: { id: "account-synthetic" },
      name: "short.test",
      type: "full",
    });
  });

  it("signs the zone with DNSSEC", async () => {
    await valueOf(result.zoneId);

    expect(named("link-dnssec")?.inputs).toMatchObject({
      status: "active",
      zoneId: "link-zone-id",
    });
  });

  it("answers HTTPS alone, from TLS 1.2, checked to the origin", async () => {
    await valueOf(result.zoneId);

    const settings = ofType("cloudflare:index/zoneSetting:ZoneSetting").map(
      (setting) => [
        input(setting, "settingId", Schema.String),
        input(setting, "value", Schema.String),
      ]
    );

    expect(
      settings.toSorted(([left = ""], [right = ""]) =>
        left.localeCompare(right)
      )
    ).toStrictEqual([
      ["always_use_https", "on"],
      ["min_tls_version", "1.2"],
      ["ssl", "strict"],
    ]);
  });

  it("sends no mail, and says so to every receiver", async () => {
    await valueOf(result.zoneId);

    const records = ofType("cloudflare:index/dnsRecord:DnsRecord").map(
      (record) => ({
        content: input(record, "content", Schema.String),
        name: input(record, "name", Schema.String),
        type: input(record, "type", Schema.String),
      })
    );

    expect(
      records.toSorted((left, right) => left.type.localeCompare(right.type))
    ).toStrictEqual([
      { content: ".", name: "short.test", type: "MX" },
      { content: '"v=spf1 -all"', name: "short.test", type: "TXT" },
      {
        content: '"v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s"',
        name: "_dmarc.short.test",
        type: "TXT",
      },
    ]);
    expect(named("link-mail-null-mx")?.inputs).toMatchObject({ priority: 0 });
  });

  it("sends the bare domain to the site, with a redirect that is not kept", async () => {
    await valueOf(result.zoneId);

    const redirect = named("link-redirect");

    expect(redirect?.inputs).toMatchObject({
      kind: "zone",
      phase: "http_request_dynamic_redirect",
      zoneId: "link-zone-id",
    });
    expect(input(redirect, "rules", RulesSchema)).toStrictEqual([
      {
        action: "redirect",
        actionParameters: {
          fromValue: {
            preserveQueryString: false,
            statusCode: 302,
            targetUrl: { value: "https://example.test/" },
          },
        },
        expression:
          '(http.host eq "short.test" and http.request.uri.path eq "/")',
      },
    ]);
  });

  it("rewrites every other path to the server's redirect route", async () => {
    await valueOf(result.zoneId);

    const rewrite = named("link-rewrite");

    expect(rewrite?.inputs).toMatchObject({
      kind: "zone",
      phase: "http_request_transform",
      zoneId: "link-zone-id",
    });
    expect(input(rewrite, "rules", RulesSchema)).toStrictEqual([
      {
        action: "rewrite",
        actionParameters: {
          uri: {
            path: { expression: 'concat("/api/l", http.request.uri.path)' },
          },
        },
        expression: '(http.request.uri.path ne "/")',
      },
    ]);
  });
});
