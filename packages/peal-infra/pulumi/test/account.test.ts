import * as pulumi from "@pulumi/pulumi";
import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import { account } from "../src/account.ts";
import { input, recordResources, valueOf } from "./support.ts";

const made = await recordResources();

const result = account(
  {
    accountId: "account-synthetic",
    domain: "example.test",
    ownerName: "Owner",
    zoneId: "zone-synthetic",
  },
  pulumi.secret("owner@example.test")
);

describe("what the account shares", () => {
  it("lets the owner in, and opens the callbacks to everyone", async () => {
    await valueOf(result.ownerPolicyId);

    const policies = made.filter(
      (resource) =>
        resource.type ===
        "cloudflare:index/zeroTrustAccessPolicy:ZeroTrustAccessPolicy"
    );

    // The owner's policy waits for its secret: it is recorded last.
    expect(
      policies
        .map((policy) => [
          input(policy, "name", Schema.String),
          input(policy, "decision", Schema.String),
        ])
        .toSorted(([left = ""], [right = ""]) => left.localeCompare(right))
    ).toStrictEqual([
      ["Owner only", "allow"],
      ["Public callbacks", "bypass"],
    ]);
  });

  it("forwards hello@ and notifications@ to the owner", async () => {
    const addresses = await Promise.all(result.forwardedAddresses.map(valueOf));
    expect(addresses).toStrictEqual([
      "hello@example.test",
      "notifications@example.test",
    ]);
  });
});
