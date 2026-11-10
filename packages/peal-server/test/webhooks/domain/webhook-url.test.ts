import { describe, expect, it } from "@effect/vitest";
import { Result } from "effect";

import {
  hostOf,
  maxWebhookUrlLength,
  parseWebhookUrl,
} from "#webhooks/domain/webhook-url.ts";

const reasonOf = (input: string) =>
  Result.match(parseWebhookUrl(input), {
    onFailure: ({ reason }) => reason,
    onSuccess: () => "accepted",
  });

describe(parseWebhookUrl, () => {
  it("takes an HTTPS address, with its path and query", () => {
    const url = Result.getOrThrow(
      parseWebhookUrl("https://hooks.example.com/peal?source=test")
    );

    expect(url).toBe("https://hooks.example.com/peal?source=test");
    expect(hostOf(url)).toBe("hooks.example.com");
  });

  it("drops the fragment, which no request carries", () => {
    expect(
      Result.getOrThrow(parseWebhookUrl("https://hooks.example.com/a#top"))
    ).toBe("https://hooks.example.com/a");
  });

  it.each([
    ["http://hooks.example.com/peal", "notHttps"],
    ["https://hooks.example.com:8443/peal", "notHttps"],
    ["ftp://hooks.example.com/peal", "notHttps"],
    ["https://user:secret@hooks.example.com/peal", "credentials"],
    ["https://user@hooks.example.com/peal", "credentials"],
    ["hooks.example.com/peal", "malformed"],
    ["", "malformed"],
    [`https://hooks.example.com/${"a".repeat(maxWebhookUrlLength)}`, "tooLong"],
  ])("refuses %s as %s", (input, reason) => {
    expect(reasonOf(input)).toBe(reason);
  });
});
