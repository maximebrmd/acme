import * as pulumi from "@pulumi/pulumi";
import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import { PealAccount } from "../src/account.ts";
import { input, recordResources, valueOf } from "./support.ts";

const made = await recordResources();

// A documentation address (RFC 5737), never a real server's.
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
      statusHostname: "status",
    },
    zoneId: "zone-synthetic",
  },
  pulumi.secret("owner@example.test")
);

describe("an uptime server without IPv6", () => {
  it("gets no AAAA record", async () => {
    await valueOf(pulumi.all(result.uptimeRecords.map((record) => record.id)));

    expect(
      made
        .filter(
          (resource) => resource.type === "cloudflare:index/dnsRecord:DnsRecord"
        )
        .map((record) => input(record, "type", Schema.String))
        .toSorted()
    ).toStrictEqual(["A", "CNAME"]);
  });
});
