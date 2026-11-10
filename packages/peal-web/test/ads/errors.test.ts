import { describe, expect, it } from "@effect/vitest";
import { Exit, Option } from "effect";
import {
  AdAccountBusy,
  BoostInvalid,
  BoostKeyReused,
  SpendCeilingExceeded,
} from "peal-contract";

import { adsErrorOf, explainAdsError } from "#ads/errors.ts";

const envelope = { code: "synthetic", message: "Synthetic refusal." };

describe(explainAdsError, () => {
  it("keeps what a refusal says: amounts, counts and rules", () => {
    expect(
      explainAdsError(
        new SpendCeilingExceeded({
          ...envelope,
          ceiling: 50_000,
          committed: 48_000,
          currency: "EUR",
          requested: 5000,
        })
      )
    ).toStrictEqual({
      ceiling: 50_000,
      committed: 48_000,
      currency: "EUR",
      key: "ceilingExceeded",
      requested: 5000,
    });
    expect(
      explainAdsError(new AdAccountBusy({ ...envelope, boosts: 2 }))
    ).toStrictEqual({ boosts: 2, key: "accountBusy" });
    expect(
      explainAdsError(
        new BoostInvalid({ ...envelope, violations: ["runTooLong"] })
      )
    ).toStrictEqual({ key: "boostInvalid", violations: ["runTooLong"] });
  });

  it("names the refusals that say nothing more, and nothing it does not know", () => {
    expect(explainAdsError(new BoostKeyReused(envelope))).toStrictEqual({
      key: "keyReused",
    });
    expect(explainAdsError({ _tag: "SomethingElse" })).toStrictEqual({
      key: "unknown",
    });
  });
});

describe(adsErrorOf, () => {
  it("finds nothing in a success, and unknown in a defect", () => {
    expect(adsErrorOf(Exit.succeed(1))).toStrictEqual(Option.none());
    expect(adsErrorOf(Exit.die("down"))).toStrictEqual(
      Option.some({ key: "unknown" })
    );
  });
});
