import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Option } from "effect";

import type {
  AuthorizationCallback,
  PlatformAuthorizer,
} from "#channels/application/platform-authorizer.ts";
import { ConnectAttempt } from "#channels/domain/connect-attempt.ts";
import { googleScope } from "#channels/infrastructure/platforms/google/google-oauth.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { youtubeCommentScope } from "#shared/domain/inbox-platform.ts";
import type { InboxPlatforms } from "#shared/domain/inbox-platform.ts";
import {
  googleBusinessAuthorizerOn,
  youtubeAuthorizerOn,
} from "#test/channels/connect-support.ts";
import { fakeGoogle } from "#test/channels/fakes/fake-google.ts";

// What Google's sign-in asks for, with the inbox's optional platforms off
// and on: off, exactly what YouTube's sign-in asked before the inbox read
// YouTube; on, the comment scope too, which an owner may untick on
// Google's consent page and still connect. Google Business Profile's
// sign-in, on the same OAuth, never changes.

const off: InboxPlatforms = new Set();

const on: InboxPlatforms = new Set(["youtube"]);

// The scope strings before the inbox read YouTube, byte for byte.
const youtubeScopesBefore =
  "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly";

const businessScopesBefore = "https://www.googleapis.com/auth/business.manage";

const begun = {
  handle: Option.none(),
  instance: Option.none(),
  reconnecting: Option.none(),
};

const scopeOf = (authorizer: PlatformAuthorizer) =>
  authorizer
    .begin(begun)
    .pipe(
      Effect.map(({ authorizationUrl }) =>
        new URL(authorizationUrl).searchParams.get("scope")
      )
    );

// The owner signs in on `authorizer`'s page and grants `granted`, or all
// that was asked; the scopes the channel is recorded with.
const signIn = Effect.fnUntraced(function* signIn(
  google: Effect.Success<ReturnType<typeof fakeGoogle>>,
  authorizer: PlatformAuthorizer,
  granted?: readonly string[]
) {
  const begin = yield* authorizer.begin(begun);
  const back = google.approve(begin.authorizationUrl, granted);
  const now = DateTime.makeUnsafe("2026-11-12T09:00:00.000Z");

  const callback: AuthorizationCallback = {
    code: Option.some(back.code),
    error: Option.none(),
    issuer: Option.none(),
    state: back.state,
  };

  const completed = yield* authorizer.complete({
    attempt: new ConnectAttempt({
      channelId: Option.none(),
      connection: Option.none(),
      createdAt: now,
      expiresAt: DateTime.addDuration(now, "15 minutes"),
      instance: Option.none(),
      platform: authorizer.platform,
      startedBy: "user:synthetic",
      state: back.state,
      workspaceId: WorkspaceIdSchema.make(
        "01900000-0000-7000-8000-0000000000f2"
      ),
    }),
    callback,
    reconnecting: Option.none(),
    secret: begin.secret,
  });

  // YouTube answers the channels the sign-in reaches, to choose from.
  return "accounts" in completed
    ? completed.accounts.map(({ tokens }) => tokens.scopes)
    : [completed.tokens.scopes];
});

describe("YouTube's comment scope at sign-in", () => {
  it("is Google's own name for it", () => {
    assert.strictEqual(youtubeCommentScope, googleScope("youtube.force-ssl"));
  });

  it.effect(
    "is not asked where the inbox does not read YouTube, as before",
    () =>
      Effect.gen(function* notAsked() {
        const google = yield* fakeGoogle();

        assert.strictEqual(
          yield* scopeOf(yield* youtubeAuthorizerOn(google.endpoints, off)),
          youtubeScopesBefore
        );
        // Another optional platform on changes nothing for YouTube.
        assert.strictEqual(
          yield* scopeOf(
            yield* youtubeAuthorizerOn(
              google.endpoints,
              new Set(["facebook", "instagram"])
            )
          ),
          youtubeScopesBefore
        );
      }).pipe(Effect.scoped)
  );

  it.effect("is asked last where the inbox reads YouTube", () =>
    Effect.gen(function* asked() {
      const google = yield* fakeGoogle();

      assert.strictEqual(
        yield* scopeOf(yield* youtubeAuthorizerOn(google.endpoints, on)),
        `${youtubeScopesBefore} ${youtubeCommentScope}`
      );
    }).pipe(Effect.scoped)
  );

  it.effect(
    "lets an owner decline it and still connect, without the scope",
    () =>
      Effect.gen(function* declined() {
        const google = yield* fakeGoogle();
        const authorizer = yield* youtubeAuthorizerOn(google.endpoints, on);

        assert.deepStrictEqual(
          yield* signIn(google, authorizer, [
            googleScope("youtube.upload"),
            googleScope("youtube.readonly"),
          ]),
          [[googleScope("youtube.upload"), googleScope("youtube.readonly")]]
        );
        assert.deepStrictEqual(yield* signIn(google, authorizer), [
          [
            googleScope("youtube.upload"),
            googleScope("youtube.readonly"),
            youtubeCommentScope,
          ],
        ]);
      }).pipe(Effect.scoped)
  );

  it.effect("leaves Google Business Profile's sign-in as it was", () =>
    Effect.gen(function* business() {
      const google = yield* fakeGoogle();

      assert.strictEqual(
        yield* scopeOf(
          yield* googleBusinessAuthorizerOn(google.businessEndpoints)
        ),
        businessScopesBefore
      );
    }).pipe(Effect.scoped)
  );
});
