import * as pulumi from "@pulumi/pulumi";
import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import { PealAccount } from "../src/account.ts";
import { input, recordResources, valueOf } from "./support.ts";
import type { Made } from "./support.ts";

const made = await recordResources();

// Documentation addresses (RFC 5737, RFC 3849), never a real server's.
const result = new PealAccount(
  "account",
  {
    accountId: "account-synthetic",
    domain: "example.test",
    linkDomain: "short.test",
    ownerName: "Owner",
    uptime: {
      hostname: "uptime",
      ipv4: "192.0.2.10",
      ipv6: "2001:db8::10",
      statusHostname: "status",
    },
    zoneId: "zone-synthetic",
  },
  pulumi.secret("owner@example.test")
);

// Pulumi hands a secret input to the mocks wrapped, with its value.
const SecretSchema = Schema.Struct({
  "4dabf18193072939515e22adb298388d": Schema.Literal(
    "1b47061264138c4ac30d75fd1eb44270"
  ),
  value: Schema.String,
});

// A record's content, a secret's value unwrapped.
const contentOf = (record: Made): string => {
  const content = input(record, "content", Schema.Unknown);

  return Schema.is(SecretSchema)(content)
    ? content.value
    : Schema.decodeUnknownSync(Schema.String)(content);
};

const records = async () => {
  await valueOf(pulumi.all(result.uptimeRecords.map((record) => record.id)));

  return made
    .filter(
      (resource) => resource.type === "cloudflare:index/dnsRecord:DnsRecord"
    )
    .toSorted((left, right) => left.name.localeCompare(right.name));
};

describe("the uptime server's records", () => {
  it("names the server and its status page, in the zone", async () => {
    const uptime = await records();

    expect(
      uptime.map((record) => [
        record.name,
        input(record, "type", Schema.String),
        input(record, "name", Schema.String),
        contentOf(record),
        input(record, "zoneId", Schema.String),
      ])
    ).toStrictEqual([
      [
        "status-cname",
        "CNAME",
        "status.example.test",
        "uptime.example.test",
        "zone-synthetic",
      ],
      ["uptime-a", "A", "uptime.example.test", "192.0.2.10", "zone-synthetic"],
      [
        "uptime-aaaa",
        "AAAA",
        "uptime.example.test",
        "2001:db8::10",
        "zone-synthetic",
      ],
    ]);
  });

  it("leaves every one unproxied, so the server answers without Cloudflare", async () => {
    for (const record of await records()) {
      expect(record.inputs).toMatchObject({ proxied: false, ttl: 1 });
    }
  });

  it("keeps the server's addresses secret, the status page's name in clear", async () => {
    const uptime = await records();

    const contents = uptime.map((record) => [
      record.name,
      Schema.is(SecretSchema)(input(record, "content", Schema.Unknown)),
    ]);

    expect(contents).toStrictEqual([
      ["status-cname", false],
      ["uptime-a", true],
      ["uptime-aaaa", true],
    ]);
  });
});
