import { describe, expect, it } from "@effect/vitest";
import type { TikTokAccount } from "peal-contract";
import { Option } from "effect";

import { initialValues } from "#posts/target-options.ts";
import { creatorLimits, fittedToCreator } from "#posts/tiktok-account.ts";

// A private account: no Duets nor Stitches, comments off, no "Everyone".
const privateAccount: TikTokAccount = {
  posting: {
    _tag: "ready",
    creator: {
      avatarUrl: null,
      commentDisabled: true,
      duetDisabled: true,
      maxVideoDurationMs: 180_000,
      nickname: "Peal Example",
      privacyLevels: [
        "FOLLOWER_OF_CREATOR",
        "MUTUAL_FOLLOW_FRIENDS",
        "SELF_ONLY",
      ],
      stitchDisabled: true,
      username: "peal_example",
    },
  },
  takesPhotos: true,
};

describe(creatorLimits, () => {
  it("offers the account's audiences, and greys out what it turned off", () => {
    const limits = creatorLimits(
      Option.some(privateAccount),
      initialValues("tiktok"),
      false
    );

    expect([
      ...(limits.fields.get("privacyLevel")?.choices ?? []),
    ]).toStrictEqual([
      "FOLLOWER_OF_CREATOR",
      "MUTUAL_FOLLOW_FRIENDS",
      "SELF_ONLY",
    ]);
    expect(limits.fields.get("disableComment")?.locked).toBe(
      "tiktok.turnedOff"
    );
    expect(limits.fields.get("disableDuet")?.locked).toBe("tiktok.turnedOff");
    expect(limits.consent).toBe("tiktok.consentMusic");
    expect(limits.label).toStrictEqual(Option.none());
  });

  it("closes Only me to branded content, and labels it a paid partnership", () => {
    const limits = creatorLimits(
      Option.none(),
      {
        ...initialValues("tiktok"),
        brandContent: true,
        brandOrganic: true,
        commercialContent: true,
      },
      false
    );

    expect([
      ...(limits.fields.get("privacyLevel")?.closedChoices?.keys() ?? []),
    ]).toStrictEqual(["SELF_ONLY"]);
    expect(limits.label).toStrictEqual(
      Option.some("tiktok.labelPaidPartnership")
    );
    expect(limits.consent).toBe("tiktok.consentBranded");
  });

  it("labels the creator's own brand as promotional content", () => {
    const limits = creatorLimits(
      Option.none(),
      {
        ...initialValues("tiktok"),
        brandOrganic: true,
        commercialContent: true,
      },
      false
    );

    expect(limits.label).toStrictEqual(Option.some("tiktok.labelPromotional"));
    expect(limits.consent).toBe("tiktok.consentMusic");
  });

  it("shows no Duets nor Stitches on photo posts", () => {
    const limits = creatorLimits(Option.none(), initialValues("tiktok"), true);

    expect(limits.fields.get("disableDuet")?.hidden).toBeTruthy();
    expect(limits.fields.get("disableStitch")?.hidden).toBeTruthy();
    expect(limits.fields.get("disableComment")?.hidden).toBeUndefined();
  });
});

describe(fittedToCreator, () => {
  it("takes back what the creator's settings forbid", () => {
    expect(
      fittedToCreator(Option.some(privateAccount), {
        ...initialValues("tiktok"),
        disableComment: false,
        privacyLevel: "PUBLIC_TO_EVERYONE",
      })
    ).toStrictEqual({ ...initialValues("tiktok"), disableComment: true });
  });

  it("keeps the same values when nothing is forbidden", () => {
    const values = { ...initialValues("tiktok"), privacyLevel: "SELF_ONLY" };

    expect(fittedToCreator(Option.some(privateAccount), values)).toBe(values);
    expect(fittedToCreator(Option.none(), values)).toBe(values);
  });
});
