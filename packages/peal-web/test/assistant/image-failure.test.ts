import { describe, expect, it } from "@effect/vitest";
import {
  AssistantFailed,
  AssistantInputRejected,
  AssistantUnavailable,
  MediaImportBusy,
  MediaStoreUnavailable,
} from "peal-contract";

import { imageFailureKey, isImageRetryable } from "#assistant/image-failure.ts";
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
