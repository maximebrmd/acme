import { describe, expect, it } from "@effect/vitest";
import { Duration } from "effect";

import {
  storableFailure,
  storableResult,
} from "#publishing/domain/storable-outcome.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { MediaRejected } from "#shared/domain/media-rejected.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import { RateLimited } from "#shared/domain/rate-limited.ts";

// What a platform answers a publishing call with, as Peal keeps it.

const nul = String.fromCodePoint(0);
const lone = String.fromCodePoint(0xd8_00);
const replaced = String.fromCodePoint(0xff_fd);

const id = (text: string) => PlatformPostIdSchema.make(text);

describe(storableResult, () => {
  it("keeps a post's id and address as one clean line each", () => {
    expect(
      storableResult({
        _tag: "published",
        keptPrivate: true,
        permalink: `https://social.example/@studio/1${nul}`,
        platformPostId: id(`110${nul}001${lone}\n`),
      })
    ).toStrictEqual({
      _tag: "published",
      keptPrivate: true,
      permalink: "https://social.example/@studio/1",
      platformPostId: `110001${replaced}`,
    });
  });

  it("drops an address that is none, and keeps the post", () => {
    for (const permalink of [
      "data:text/html,synthetic",
      `https://social.example/${"p".repeat(3000)}`,
      "not an address",
    ]) {
      expect(
        storableResult({
          _tag: "published",
          permalink,
          platformPostId: id("1"),
        })
      ).toStrictEqual({ _tag: "published", platformPostId: "1" });
    }
  });

  it("never takes a post made under an unreadable id for a refusal", () => {
    expect(
      storableResult({ _tag: "published", platformPostId: id(`${nul}${nul}`) })
    ).toStrictEqual({ _tag: "unconfirmed", reason: "unreadableResponse" });
  });

  it("leaves an unconfirmed result as it is", () => {
    const unconfirmed = { _tag: "unconfirmed", reason: "noResponse" } as const;

    expect(storableResult(unconfirmed)).toBe(unconfirmed);
  });
});

describe(storableFailure, () => {
  it("keeps a refusal's code as one bounded line", () => {
    const code = `duplicate${nul}\nline two ${"x".repeat(500)}`;

    const kept = `duplicate line two ${"x".repeat(500)}`.slice(0, 200);

    expect(storableFailure(new BadRequest({ code }))).toStrictEqual(
      new BadRequest({ code: kept })
    );
    expect(storableFailure(new MediaRejected({ code }))).toStrictEqual(
      new MediaRejected({ code: kept })
    );

    const limited = storableFailure(
      new RateLimited({ code: `quota${nul}`, retryAfter: Duration.seconds(5) })
    );

    expect(limited).toStrictEqual(
      new RateLimited({ code: "quota", retryAfter: Duration.seconds(5) })
    );
  });

  it("leaves a failure without words as it is", () => {
    const down = new PlatformUnavailable();
    const slow = new RateLimited({});

    expect(storableFailure(down)).toBe(down);
    expect(storableFailure(slow)).toBe(slow);
  });
});
