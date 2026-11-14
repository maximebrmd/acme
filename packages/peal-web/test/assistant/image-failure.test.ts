import { describe, expect, it } from "@effect/vitest";
import { DateTime } from "effect";
import {
  AssistantFailed,
  AssistantInputRejected,
  AssistantUnavailable,
  ImageProviderRefused,
  MediaImportBusy,
  OwnImageLimitReached,
  MediaStoreUnavailable,
} from "peal-contract";

import {
  imageAllowanceHint,
  imageFailureKey,
  isImageRetryable,
} from "#assistant/image-failure.ts";
import { canGenerateImages } from "#assistant/permissions.ts";

describe(imageFailureKey, () => {
  it("says why no image was made", () => {
    expect(
      [
        new AssistantFailed({ reason: "declined" }),
        new AssistantFailed({ reason: "unreachable" }),
        new AssistantInputRejected({ maxLength: 1000, reason: "tooLong" }),
        new AssistantUnavailable(),
        new MediaImportBusy(),
        new MediaStoreUnavailable(),
        { _tag: "Unexpected" } as const,
      ].map(imageFailureKey)
    ).toStrictEqual([
      "declined",
      "unreachable",
      "tooLong",
      "unavailable",
      "busy",
      "storeDown",
      "generic",
    ]);
  });

  it("says the workspace's own provider refused, and why", () => {
    expect(
      (
        [
          "settingsRefused",
          "addressRefused",
          "keyUnreadable",
          "redirected",
        ] as const
      ).map((reason) =>
        imageFailureKey(
          new ImageProviderRefused({
            reason,
            status: reason === "settingsRefused" ? 401 : null,
          })
        )
      )
    ).toStrictEqual([
      "providerRefused",
      "providerAddress",
      "providerKey",
      "providerRedirected",
    ]);
  });

  it("says the workspace asked its own provider for all a day allows", () => {
    expect(
      imageFailureKey(
        new OwnImageLimitReached({
          dailyLimit: 50,
          resetsAt: DateTime.makeUnsafe("2026-11-13T00:00:00Z"),
        })
      )
    ).toBe("ownLimit");
  });

  it("offers to try again only where it may work", () => {
    expect(
      [
        new AssistantFailed({ reason: "declined" }),
        new AssistantFailed({ reason: "timedOut" }),
        new AssistantUnavailable(),
        new MediaImportBusy(),
        new ImageProviderRefused({ reason: "settingsRefused", status: 403 }),
      ].map(isImageRetryable)
    ).toStrictEqual([false, true, false, true, false]);
  });
});

describe(canGenerateImages, () => {
  it("takes both assistant:use and media:upload", () => {
    expect([
      canGenerateImages(["assistant:use", "media:upload"]),
      canGenerateImages(["assistant:use"]),
      canGenerateImages(["media:upload"]),
    ]).toStrictEqual([true, false, false]);
  });
});

describe(imageAllowanceHint, () => {
  const images = {
    aspects: ["square"] as const,
    available: true,
    dailyLimit: 20,
    maxPromptLength: 1000,
    month: null,
    reason: null,
    requestCost: 5,
    source: "server" as const,
  };

  it("reads the month's images on a server that bills", () => {
    const month = {
      allowance: 10,
      ceiling: { amount: 0, currency: "usd" },
      most: 10,
      price: { cents: 5, per: 1 },
      priceConfirmed: false,
      resetsAt: DateTime.makeUnsafe("2026-12-01T00:00:00Z"),
      used: 10,
    };

    expect([
      imageAllowanceHint({
        images: { ...images, month: { ...month, used: 3 } },
        remaining: 0,
      }),
      imageAllowanceHint({ images: { ...images, month }, remaining: 50 }),
      imageAllowanceHint({
        images: { ...images, month: { ...month, most: 0, used: 0 } },
        remaining: 50,
      }),
    ]).toStrictEqual([null, "notEnoughToday", "noImagesOnPlan"]);
  });

  it("says when the plan makes no image, and when today is spent", () => {
    expect([
      imageAllowanceHint({
        images: { ...images, dailyLimit: 3 },
        remaining: 3,
      }),
      imageAllowanceHint({
        images: { ...images, dailyLimit: 0 },
        remaining: 20,
      }),
      imageAllowanceHint({ images, remaining: 4 }),
      imageAllowanceHint({ images, remaining: 5 }),
    ]).toStrictEqual([
      "noImagesOnPlan",
      "noImagesOnPlan",
      "notEnoughToday",
      null,
    ]);
  });

  it("says nothing of requests when the workspace's own provider makes them", () => {
    expect([
      imageAllowanceHint({
        images: {
          ...images,
          dailyLimit: 0,
          requestCost: 0,
          source: "workspace",
        },
        remaining: 0,
      }),
      imageAllowanceHint({
        images: {
          ...images,
          dailyLimit: 3,
          requestCost: 0,
          source: "workspace",
        },
        remaining: 3,
      }),
    ]).toStrictEqual([null, null]);
  });
});
