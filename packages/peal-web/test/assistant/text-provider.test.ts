import { describe, expect, it } from "@effect/vitest";
import { DateTime } from "effect";
import {
  AssistantFailed,
  AssistantSecretsNotConfigured,
  OwnTextLimitReached,
  TextProviderAddressRefused,
  TextProviderKeyRequired,
  TextProviderNotFound,
  TextProviderRefused,
} from "peal-contract";
import type { AssistantStatus, TextProvider } from "peal-contract";

import { assistantBlockedBy } from "#assistant/suggestion.ts";
import {
  changeOf,
  draftOf,
  isSavable,
  keyNeeded,
  kindChanged,
  providerErrorKey,
  testFailureKey,
} from "#assistant/text-provider.ts";

const saved: TextProvider = {
  baseUrl: "https://text.example.com/v1",
  keySet: true,
  keyUnreadable: false,
  kind: "openai-compatible",
  model: "synthetic-text-model",
  updatedAt: DateTime.makeUnsafe("2026-11-13T09:00:00Z"),
};

describe(draftOf, () => {
  it("starts an empty form on Anthropic, at its address", () => {
    expect(draftOf(null)).toStrictEqual({
      apiKey: "",
      baseUrl: "https://api.anthropic.com",
      kind: "anthropic",
      model: "",
    });
  });

  it("starts from what the workspace saved, never its key", () => {
    expect(draftOf(saved)).toStrictEqual({
      apiKey: "",
      baseUrl: "https://text.example.com/v1",
      kind: "openai-compatible",
      model: "synthetic-text-model",
    });
  });
});

describe(kindChanged, () => {
  it("fills in Anthropic's address, and clears it for another endpoint", () => {
    expect(kindChanged(draftOf(null), "openai-compatible").baseUrl).toBe("");
    expect(
      kindChanged(
        { ...draftOf(saved), baseUrl: "https://text.example.com/v1" },
        "anthropic"
      ).baseUrl
    ).toBe("https://api.anthropic.com");
  });

  it("keeps an address the member typed for the same kind of API", () => {
    expect(
      kindChanged(
        { ...draftOf(saved), baseUrl: "https://text.example.com/v1" },
        "openai-compatible"
      ).baseUrl
    ).toBe("https://text.example.com/v1");
  });
});

describe(keyNeeded, () => {
  it("keeps the saved key for the same address only", () => {
    expect([
      keyNeeded({ ...draftOf(saved), model: "synthetic-text-model-2" }, saved),
      keyNeeded(
        { ...draftOf(saved), baseUrl: "https://text.example.com/v2" },
        saved
      ),
      keyNeeded(draftOf(null), null),
      keyNeeded(draftOf(saved), { ...saved, keyUnreadable: true }),
    ]).toStrictEqual([null, "keyAgain", "noKey", "keyUnreadable"]);
  });
});

describe(changeOf, () => {
  it("sends the key only when it was typed, trimmed", () => {
    expect(changeOf(draftOf(saved))).toStrictEqual({
      baseUrl: "https://text.example.com/v1",
      kind: "openai-compatible",
      model: "synthetic-text-model",
    });
    expect(
      changeOf({ ...draftOf(saved), apiKey: "  synthetic-key \n" })
    ).toStrictEqual({
      apiKey: "synthetic-key",
      baseUrl: "https://text.example.com/v1",
      kind: "openai-compatible",
      model: "synthetic-text-model",
    });
  });
});

describe(isSavable, () => {
  it("needs an address, a model, and a key unless the saved one is kept", () => {
    expect([
      isSavable(draftOf(null), null),
      isSavable({ ...draftOf(null), apiKey: "k", model: "m" }, null),
      isSavable(draftOf(saved), saved),
      isSavable({ ...draftOf(saved), baseUrl: " " }, saved),
    ]).toStrictEqual([false, true, true, false]);
  });
});

describe(providerErrorKey, () => {
  it("says why a save failed", () => {
    expect(
      [
        new TextProviderAddressRefused({ reason: "notPublic" }),
        new TextProviderKeyRequired(),
        new AssistantSecretsNotConfigured(),
        { _tag: "Unexpected" } as const,
      ].map(providerErrorKey)
    ).toStrictEqual(["notPublic", "keyRequired", "notConfigured", "generic"]);
  });
});

describe(testFailureKey, () => {
  it("says why the provider's test failed", () => {
    expect(
      [
        new TextProviderRefused({ reason: "settingsRefused", status: 401 }),
        new TextProviderRefused({ reason: "redirected", status: 307 }),
        new TextProviderRefused({ reason: "addressRefused", status: null }),
        new TextProviderRefused({ reason: "keyUnreadable", status: null }),
        new AssistantFailed({ reason: "invalidAnswer" }),
        new AssistantFailed({ reason: "unreachable" }),
        new OwnTextLimitReached({
          dailyLimit: 500,
          resetsAt: DateTime.makeUnsafe("2026-11-14T00:00:00Z"),
        }),
        new TextProviderNotFound(),
      ].map(testFailureKey)
    ).toStrictEqual([
      "providerRefused",
      "providerRedirected",
      "providerAddress",
      "providerKey",
      "invalidAnswer",
      "unreachable",
      "ownLimit",
      "generic",
    ]);
  });
});

const status = (
  source: AssistantStatus["source"],
  remaining: number
): Pick<AssistantStatus, "maxTextLength" | "remaining" | "source"> => ({
  maxTextLength: 5000,
  remaining,
  source,
});

describe(assistantBlockedBy, () => {
  it("blocks on the day's requests only when Peal's model writes", () => {
    expect([
      assistantBlockedBy(status("server", 0), "A post."),
      assistantBlockedBy(status("workspace", 0), "A post."),
      assistantBlockedBy(status("workspace", 0), " "),
      assistantBlockedBy(status("server", 3), "x".repeat(5001)),
    ]).toStrictEqual(["noRequestsLeft", null, "needsText", "textTooLong"]);
  });
});
