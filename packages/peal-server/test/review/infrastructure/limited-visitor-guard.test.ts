import { assert, describe, it } from "@effect/vitest";
import { ConfigProvider, Effect, Layer, Option } from "effect";

import { VisitorGuard } from "#review/application/ports/visitor-guard.ts";
import { ReviewLinkIdSchema } from "#review/domain/review-ids.ts";
import {
  LimitedVisitorGuard,
  writesPerAddress,
  writesPerLink,
} from "#review/infrastructure/limited-visitor-guard.ts";
import {
  dummyToken,
  failingSecretKey,
  fakeTurnstile,
  passingSecretKey,
  passingSiteKey,
} from "#test/workspace/fakes/fake-turnstile.ts";

// What visitors' writes go through before they are taken: the limits per
// address and per link, and Turnstile where the server has its keys,
// checked against the fake siteverify on a loopback port.

const linkId = ReviewLinkIdSchema.make("00000000-0000-7000-8000-00000000000a");

const otherLink = ReviewLinkIdSchema.make(
  "00000000-0000-7000-8000-00000000000b"
);

const guardWith = (env: Readonly<Record<string, string>>) =>
  LimitedVisitorGuard.pipe(
    Layer.provide(ConfigProvider.layer(ConfigProvider.fromUnknown(env)))
  );

const admit = (
  address: string,
  link = linkId,
  captchaToken: Option.Option<string> = Option.none()
) =>
  VisitorGuard.use((guard) =>
    guard.admit({ address, captchaToken, linkId: link })
  );

const withTurnstile = <A, E>(
  secretKey: string,
  test: Effect.Effect<A, E, VisitorGuard>
) =>
  Effect.gen(function* withFake() {
    const turnstile = yield* fakeTurnstile;

    return yield* test.pipe(
      Effect.provide(
        guardWith({
          TURNSTILE_SECRET_KEY: secretKey,
          TURNSTILE_SITE_KEY: passingSiteKey,
          TURNSTILE_VERIFY_URL: `${turnstile.url}/turnstile/v0/siteverify`,
        })
      )
    );
  });

describe("the limits on what visitors write", () => {
  it.effect("takes so many writes from one address, then refuses", () =>
    Effect.gen(function* perAddress() {
      for (let write = 0; write < writesPerAddress.limit; write += 1) {
        assert.deepStrictEqual(
          yield* admit("203.0.113.7", write % 2 === 0 ? linkId : otherLink),
          Option.none()
        );
      }

      assert.deepStrictEqual(
        yield* admit("203.0.113.7"),
        Option.some("tooManyRequests" as const)
      );
      // Another address still writes.
      assert.deepStrictEqual(yield* admit("203.0.113.8"), Option.none());
    }).pipe(Effect.provide(guardWith({})))
  );

  it.effect("takes so many writes through one link, whoever sends them", () =>
    Effect.gen(function* perLink() {
      for (let write = 0; write < writesPerLink.limit; write += 1) {
        assert.deepStrictEqual(
          yield* admit(`198.51.100.${write}`),
          Option.none()
        );
      }

      assert.deepStrictEqual(
        yield* admit("198.51.100.200"),
        Option.some("tooManyRequests" as const)
      );
      assert.deepStrictEqual(
        yield* admit("198.51.100.200", otherLink),
        Option.none()
      );
    }).pipe(Effect.provide(guardWith({})))
  );

  it.effect(
    "asks for a captcha token once the server has Turnstile's keys",
    () =>
      withTurnstile(
        passingSecretKey,
        Effect.gen(function* captcha() {
          assert.deepStrictEqual(
            yield* admit("203.0.113.9"),
            Option.some("captchaRequired" as const)
          );
          assert.deepStrictEqual(
            yield* admit("203.0.113.9", linkId, Option.some("not a token")),
            Option.some("captchaRequired" as const)
          );
          assert.deepStrictEqual(
            yield* admit("203.0.113.9", linkId, Option.some(dummyToken)),
            Option.none()
          );
        })
      )
  );

  it.effect("refuses a token Turnstile does not take", () =>
    withTurnstile(
      failingSecretKey,
      Effect.gen(function* refused() {
        assert.deepStrictEqual(
          yield* admit("203.0.113.10", linkId, Option.some(dummyToken)),
          Option.some("captchaRequired" as const)
        );
      })
    )
  );
});
