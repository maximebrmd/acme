import { describe, expect, it } from "@effect/vitest";
import { DateTime, Duration, Option, Result } from "effect";

import { ConnectLinkIdSchema } from "#channels/domain/connect-link-id.ts";
import {
  completeLink,
  createLink,
  isExpired,
  linkActor,
  maxLinkStarts,
  revokeLink,
  startLink,
  usable,
} from "#channels/domain/connect-link.ts";
import type { ConnectLink } from "#channels/domain/connect-link.ts";
import { linkInputOf } from "#channels/domain/link-input.ts";
import { returnAddressOf } from "#channels/domain/return-address.ts";
import { ChannelIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";

const now = DateTime.makeUnsafe("2026-11-10T09:00:00Z");

const workspaceId = WorkspaceIdSchema.make(
  "5b0c6e64-5d0f-4a7e-9a52-3f1c2d4e5f60"
);

const linkOf = (returnUrl: Option.Option<string> = Option.none()) =>
  createLink(
    {
      channelId: Option.none(),
      connection: Option.none(),
      createdBy: "apiKey:synthetic",
      id: ConnectLinkIdSchema.make("00000000-0000-7000-8000-0000000000aa"),
      lifetime: Duration.hours(2),
      locale: Option.none(),
      platform: "mastodon",
      returnUrl,
      workspaceId,
    },
    now
  );

const after = (duration: Duration.Input) =>
  DateTime.addDuration(now, Duration.fromInputUnsafe(duration));

const refusal = (result: Result.Result<ConnectLink, { reason: string }>) =>
  Result.isFailure(result) ? result.failure.reason : "usable";

describe("a connect link", () => {
  it("works until its time, and not a moment past it", () => {
    const link = linkOf();

    expect(isExpired(link, after("119 minutes"))).toBeFalsy();
    expect(isExpired(link, after("2 hours"))).toBeTruthy();
    expect(refusal(usable(link, after("2 hours")))).toBe("expired");
  });

  it("is started a bounded number of times, each by one browser", () => {
    let link = linkOf();

    for (let started = 0; started < maxLinkStarts; started += 1) {
      link = Result.getOrThrow(startLink(link, `browser-${started}`, now));
    }

    expect(link.starts).toBe(maxLinkStarts);
    expect(Option.getOrNull(link.browser)).toBe(`browser-${maxLinkStarts - 1}`);
    expect(refusal(startLink(link, "one-more", now))).toBe("exhausted");
  });

  it("ends once: used or revoked, it starts nothing more", () => {
    const channelId = ChannelIdSchema.make(
      "00000000-0000-7000-8000-0000000000cc"
    );

    const used = completeLink(linkOf(), [channelId], now);
    const revoked = revokeLink(linkOf(), now);

    expect(refusal(startLink(used, "browser", now))).toBe("completed");
    expect(refusal(startLink(revoked, "browser", now))).toBe("revoked");
    // Revoking what was used leaves it used, and never expired.
    expect(revokeLink(used, now)).toBe(used);
    expect(isExpired(used, after("3 hours"))).toBeFalsy();
  });

  it("acts in its workspace to connect accounts, and nothing else", () => {
    const actor = linkActor(linkOf());

    expect(actor.permissions).toStrictEqual(["channel:connect"]);
    expect(actor.workspaceId).toBe(workspaceId);
    expect(actor.subject).toStrictEqual({
      _tag: "apiKey",
      apiKeyId: "connect-link:00000000-0000-7000-8000-0000000000aa",
    });
  });
});

describe(returnAddressOf, () => {
  it("adds the link and how it ended, over anything of the same name", () => {
    const link = linkOf(
      Option.some(
        "https://app.example.test/social?tab=1&peal_status=connected#accounts"
      )
    );

    expect(Option.getOrNull(returnAddressOf(link, "failed"))).toBe(
      "https://app.example.test/social?tab=1&peal_status=failed&peal_link=00000000-0000-7000-8000-0000000000aa#accounts"
    );
  });

  it("goes nowhere for a link without a return address", () => {
    expect(returnAddressOf(linkOf(), "connected")).toStrictEqual(Option.none());
  });
});

describe(linkInputOf, () => {
  it("asks for what each platform's sign-in starts from", () => {
    expect(
      (["mastodon", "bluesky", "linkedin", "x"] as const).map(linkInputOf)
    ).toStrictEqual(["instance", "handle", "none", "none"]);
  });
});
