import * as pulumi from "@pulumi/pulumi";
import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import { PealAccount } from "../src/account.ts";
import { input, recordResources, valueOf } from "./support.ts";

const made = await recordResources();

const result = new PealAccount(
  "account",
  {
    accountId: "account-synthetic",
    blueskyDid: "did:plc:synthetic",
    domain: "example.test",
    linkDomain: "short.test",
    ownerName: "Owner",
    zoneId: "zone-synthetic",
  },
  pulumi.secret("owner@example.test")
);

describe("the domain as the Bluesky account's handle", () => {
  it("names the account's DID in the domain's _atproto record", async () => {
    await valueOf(result.ownerPolicyId);

    const records = made.filter(
      (resource) => resource.type === "cloudflare:index/dnsRecord:DnsRecord"
    );

    expect(
      records.map((record) => [
        input(record, "type", Schema.String),
        input(record, "name", Schema.String),
        input(record, "content", Schema.String),
        input(record, "proxied", Schema.Boolean),
      ])
    ).toStrictEqual([
      ["TXT", "_atproto.example.test", '"did=did:plc:synthetic"', false],
    ]);
    expect(result.blueskyHandleRecord).toBeDefined();
  });
});
