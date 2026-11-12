import { describe, expect, it } from "@effect/vitest";
import {
  AssistantFailed,
  AssistantInputRejected,
  AssistantUnavailable,
  MediaImportBusy,
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

  it("offers to try again only where it may work", () => {
    expect(
      [
        new AssistantFailed({ reason: "declined" }),
        new AssistantFailed({ reason: "timedOut" }),
        new AssistantUnavailable(),
        new MediaImportBusy(),
      ].map(isImageRetryable)
    ).toStrictEqual([false, true, false, true]);
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
    requestCost: 5,
  };

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
});
