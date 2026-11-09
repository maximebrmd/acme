import { assert, describe, expect, it } from "@effect/vitest";
import { DateTime, Duration, Effect, Option, Schema, Stream } from "effect";
import { Headers } from "effect/http";

import { inParts } from "#publishing/infrastructure/platforms/byte-parts.ts";
import {
  defaultLinkedInVersion,
  LinkedInVersionSchema,
} from "#publishing/infrastructure/platforms/linkedin/linkedin-version.ts";
import { littleTextOf } from "#publishing/infrastructure/platforms/linkedin/little-text.ts";
import {
  isSamePost,
  isSameText,
} from "#publishing/infrastructure/platforms/x/x-post-match.ts";
import { xRetryAfter } from "#publishing/infrastructure/platforms/x/x-refusal.ts";

// What the LinkedIn and X adapters write and read besides their requests.

describe("LinkedIn's little text format", () => {
  it("escapes every character the format reserves", () => {
    expect(littleTextOf("a|b{c}d@e[f]g(h)i<j>k#1\\l*m_n~o")).toBe(
      "a\\|b\\{c\\}d\\@e\\[f\\]g\\(h\\)i\\<j\\>k\\#1\\\\l\\*m\\_n\\~o"
    );
  });

  it("writes hashtags as LinkedIn's template, so they show as hashtags", () => {
    expect(littleTextOf("#launch day, see #new_things!")).toBe(
      "{hashtag|\\#|launch} day, see {hashtag|\\#|new\\_things}!"
    );
  });

  it("leaves what is not a hashtag as escaped text", () => {
    expect(littleTextOf("C# and #2026 and a#b")).toBe(
      "C\\# and \\#2026 and a\\#b"
    );
  });

  it("keeps plain text and line breaks as they are", () => {
    expect(littleTextOf("Hello, world.\nSecond line: ok?")).toBe(
      "Hello, world.\nSecond line: ok?"
    );
  });
});

const partsOf = (chunks: readonly number[], size: (index: number) => number) =>
  Stream.fromIterable(
    chunks.map((length, chunk) =>
      Uint8Array.from({ length }, (_, index) => (chunk * 31 + index) % 251)
    )
  ).pipe(inParts(size), Stream.runCollect);

describe("the parts of an upload", () => {
  it.effect("are cut at the sizes asked, whatever the store's chunks", () =>
    Effect.gen(function* cut() {
      const parts = yield* partsOf([3, 7, 1, 9], () => 4);

      assert.deepStrictEqual(
        parts.map((part) => part.length),
        [4, 4, 4, 4, 4]
      );

      const whole = parts.flatMap((part) => [...part]);

      const sent = (yield* partsOf([3, 7, 1, 9], () => 100)).flatMap((part) => [
        ...part,
      ]);

      assert.deepStrictEqual(whole, sent);
    })
  );

  it.effect("end with what is left, and take each part's own size", () =>
    Effect.gen(function* sized() {
      const parts = yield* partsOf([10], (index) => (index === 0 ? 6 : 3));

      assert.deepStrictEqual(
        parts.map((part) => part.length),
        [6, 3, 1]
      );
      assert.lengthOf(yield* partsOf([], () => 4), 0);
    })
  );
});

describe("X's text, as it shows it back", () => {
  it("matches the text sent despite its short links and entities", () => {
    expect(
      isSameText(
        "Read https://peal.example/launch & share <3",
        "Read https://t.co/aBcDeF1234 &amp; share &lt;3 https://t.co/MeDiA56789"
      )
    ).toBeTruthy();
  });

  it("does not match another text", () => {
    expect(isSameText("Launch day", "Launch night")).toBeFalsy();
  });

  it("takes a post for the one sent only when it links to the same places", () => {
    const sent = "Read (https://Peal.example) and www.peal.example/two.";

    expect(
      isSamePost(sent, {
        linksTo: ["https://peal.example/", "http://www.peal.example/two"],
        text: "Read (https://t.co/a) and https://t.co/b.",
      })
    ).toBeTruthy();
    expect(
      isSamePost(sent, {
        linksTo: ["https://peal.example/", "http://www.peal.example/one"],
        text: "Read (https://t.co/a) and https://t.co/b.",
      })
    ).toBeFalsy();
    expect(
      isSamePost(sent, {
        linksTo: [],
        text: "Read (https://t.co/a) and https://t.co/b.",
      })
    ).toBeFalsy();
  });

  it("reads back entities in X's text only, not in the text sent", () => {
    // Typed as it is: X shows the ampersand of "&amp;" as an entity too.
    expect(
      isSameText("Write &amp; as &", "Write &amp;amp; as &amp;")
    ).toBeTruthy();
    expect(isSameText("Fish &amp; chips", "Fish &amp; chips")).toBeFalsy();
  });
});

describe("X's rate limit headers", () => {
  const now = DateTime.makeUnsafe("2026-06-15T07:00:00Z");

  const at = (minutes: number) =>
    String(DateTime.toEpochMillis(now) / 1000 + minutes * 60);

  it("wait for the latest reset among the spent windows", () => {
    const headers = Headers.fromInput({
      "x-app-limit-24hour-remaining": "0",
      "x-app-limit-24hour-reset": at(90),
      "x-rate-limit-remaining": "0",
      "x-rate-limit-reset": at(10),
      "x-user-limit-24hour-remaining": "12",
      "x-user-limit-24hour-reset": at(600),
    });

    expect(xRetryAfter(headers, now)).toStrictEqual(
      Option.some(Duration.minutes(90))
    );
  });

  it("fall back to the endpoint's reset, then to Retry-After", () => {
    expect(
      xRetryAfter(Headers.fromInput({ "x-rate-limit-reset": at(15) }), now)
    ).toStrictEqual(Option.some(Duration.minutes(15)));
    expect(
      xRetryAfter(Headers.fromInput({ "retry-after": "30" }), now)
    ).toStrictEqual(Option.some(Duration.seconds(30)));
    expect(xRetryAfter(Headers.fromInput({}), now)).toStrictEqual(
      Option.none()
    );
  });
});

describe("the LinkedIn API version", () => {
  it("is a YYYYMM month", () => {
    expect(
      Schema.is(LinkedInVersionSchema)(defaultLinkedInVersion)
    ).toBeTruthy();
    expect(Schema.is(LinkedInVersionSchema)("202613")).toBeFalsy();
    expect(Schema.is(LinkedInVersionSchema)("2026-10")).toBeFalsy();
  });

  // LinkedIn retires a version a year after its release: a default older
  // than ten months fails here, so it moves before a release ships it.
  it.live("is at most ten months old", () =>
    Effect.gen(function* fresh() {
      const now = yield* DateTime.now;
      const parts = DateTime.toParts(now);
      const year = Number(defaultLinkedInVersion.slice(0, 4));
      const month = Number(defaultLinkedInVersion.slice(4));
      const age = (parts.year - year) * 12 + (parts.month - month);

      assert.isAtMost(
        age,
        10,
        `LINKEDIN_API_VERSION's default ${defaultLinkedInVersion} is ${age} months old: move it to a recent version`
      );
    })
  );
});
