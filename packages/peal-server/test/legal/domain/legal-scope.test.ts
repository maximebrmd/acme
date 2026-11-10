import { describe, expect, it } from "@effect/vitest";
import { DateTime } from "effect";

import { covering, disclosedOf } from "#legal/domain/legal-scope.ts";

const at = (iso: string) => DateTime.makeUnsafe(iso);

const held = {
  closedAt: at("2026-06-01T12:00:00Z"),
  email: "ana@example.test",
  name: "Ana Synthetic",
  signInMethods: [{ accountId: "synthetic-account", provider: "credential" }],
  stripeCustomerIds: ["cus_synthetic"],
  userId: "5b1f0d6e-2f6b-4c57-9c06-3b7e7d0f2a11",
};

describe(disclosedOf, () => {
  it("hands over only what the request covers, and names the account either way", () => {
    expect(disclosedOf(held, covering(["identity"]))).toStrictEqual({
      closedAt: held.closedAt,
      identity: {
        email: held.email,
        name: held.name,
      },
      signInMethods: null,
      stripeCustomerIds: null,
      userId: held.userId,
    });

    expect(disclosedOf(held, covering(["connections"]))).toStrictEqual({
      closedAt: held.closedAt,
      identity: null,
      signInMethods: null,
      stripeCustomerIds: null,
      userId: held.userId,
    });
  });

  it("hands over how the account signed in and paid when the request asks", () => {
    const disclosed = disclosedOf(held, covering(["signIn", "payments"]));

    expect(disclosed.identity).toBeNull();
    expect(disclosed.signInMethods).toStrictEqual(held.signInMethods);
    expect(disclosed.stripeCustomerIds).toStrictEqual(held.stripeCustomerIds);
  });
});
