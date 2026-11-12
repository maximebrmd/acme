import { describe, expect, it } from "@effect/vitest";
import { DateTime } from "effect";
import {
  AssistantSecretsNotConfigured,
  ImageProviderAddressRefused,
  ImageProviderKeyRequired,
} from "peal-contract";
import type { ImageProvider } from "peal-contract";

import {
  changeOf,
  draftOf,
  isSavable,
  keyNeeded,
  providerErrorKey,
} from "#assistant/image-provider.ts";

const saved: ImageProvider = {
  baseUrl: "https://images.example.com/v1",
  keySet: true,
  keyUnreadable: false,
  model: "synthetic-image-model",
  updatedAt: DateTime.makeUnsafe("2026-11-12T09:00:00Z"),
};

describe(keyNeeded, () => {
  it("keeps the saved key for the same address only", () => {
    expect([
      keyNeeded({ ...draftOf(saved), model: "synthetic-image-model-2" }, saved),
      keyNeeded(
        { ...draftOf(saved), baseUrl: "https://images.example.com/v1/" },
        saved
      ),
      keyNeeded(
        { ...draftOf(saved), baseUrl: "https://images.example.com/v2" },
        saved
      ),
    ]).toStrictEqual([null, null, "keyAgain"]);
  });

  it("asks for the key when none is saved, it is unreadable, or the address changed", () => {
    expect([
      keyNeeded(draftOf(null), null),
      keyNeeded(draftOf(saved), { ...saved, keyUnreadable: true }),
      keyNeeded(
        { ...draftOf(saved), baseUrl: "https://other-images.example.com/v1" },
        saved
      ),
      keyNeeded({ ...draftOf(saved), baseUrl: "not an address" }, saved),
    ]).toStrictEqual(["noKey", "keyUnreadable", "keyAgain", "keyAgain"]);
  });
});

describe(changeOf, () => {
  it("sends the key only when it was typed", () => {
    expect(
      changeOf({
        ...draftOf(saved),
        baseUrl: " https://images.example.com/v1 ",
      })
    ).toStrictEqual({
      baseUrl: "https://images.example.com/v1",
      model: "synthetic-image-model",
    });
    expect(
      changeOf({ ...draftOf(saved), apiKey: "synthetic-workspace-image-key" })
    ).toStrictEqual({
      apiKey: "synthetic-workspace-image-key",
      baseUrl: "https://images.example.com/v1",
      model: "synthetic-image-model",
    });
  });
});

describe(isSavable, () => {
  it("takes an address, a model, and a key where one is needed", () => {
    expect([
      isSavable(draftOf(saved), saved),
      isSavable(draftOf(null), null),
      isSavable(
        {
          apiKey: "synthetic-workspace-image-key",
          baseUrl: "https://images.example.com/v1",
          model: "synthetic-image-model",
        },
        null
      ),
      isSavable({ ...draftOf(saved), model: " " }, saved),
    ]).toStrictEqual([true, false, true, false]);
  });
});

describe(providerErrorKey, () => {
  it("says why the provider was not saved", () => {
    expect(
      [
        new ImageProviderAddressRefused({ reason: "notPublic" }),
        new ImageProviderKeyRequired(),
        new AssistantSecretsNotConfigured(),
        { _tag: "Unexpected" } as const,
      ].map(providerErrorKey)
    ).toStrictEqual(["notPublic", "keyRequired", "notConfigured", "generic"]);
  });
});
