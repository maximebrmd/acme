import { assert, describe, it } from "@effect/vitest";
import { ConfigProvider, Effect, Result } from "effect";

import { inboxPlatformsConfig } from "#shared/infrastructure/inbox-platforms.ts";

// `PEAL_INBOX_PLATFORMS`, read once when the server starts: the platforms
// whose comments wait for Meta's review are off unless named, and a name
// the server cannot serve stops it.

const metaApp = {
  META_APP_ID: "100000000000001",
  META_APP_SECRET: "synthetic-meta-secret",
};

const instagramApp = {
  INSTAGRAM_APP_ID: "100000000000002",
  INSTAGRAM_APP_SECRET: "synthetic-instagram-secret",
};

const youtubeApp = {
  YOUTUBE_CLIENT_ID: "1234-synthetic.apps.googleusercontent.example",
  YOUTUBE_CLIENT_SECRET: "synthetic-google-secret",
};

const linkedinPagesApp = {
  LINKEDIN_PAGES_CLIENT_ID: "88synthetic-pages",
  LINKEDIN_PAGES_CLIENT_SECRET: "synthetic-linkedin-pages-secret",
};

const businessApp = {
  GOOGLE_BUSINESS_CLIENT_ID: "synthetic-business.apps.example",
  GOOGLE_BUSINESS_CLIENT_SECRET: "synthetic-business-secret",
};

const read = (env: Record<string, string>) =>
  inboxPlatformsConfig.pipe(
    Effect.provide(ConfigProvider.layer(ConfigProvider.fromUnknown(env))),
    Effect.map((platforms) => [...platforms].toSorted()),
    Effect.result
  );

describe("the inbox's optional platforms", () => {
  it.effect("are off unless named", () =>
    Effect.gen(function* off() {
      assert.deepStrictEqual(yield* read({}), Result.succeed([]));
      assert.deepStrictEqual(
        yield* read({ ...metaApp, PEAL_INBOX_PLATFORMS: " " }),
        Result.succeed([])
      );
    })
  );

  it.effect("are those named, with the apps they sign in with", () =>
    Effect.gen(function* named() {
      assert.deepStrictEqual(
        yield* read({
          ...metaApp,
          PEAL_INBOX_PLATFORMS: "facebook, instagram",
        }),
        Result.succeed(["facebook", "instagram"])
      );
      assert.deepStrictEqual(
        yield* read({ ...youtubeApp, PEAL_INBOX_PLATFORMS: "youtube" }),
        Result.succeed(["youtube"])
      );
      assert.deepStrictEqual(
        yield* read({ ...linkedinPagesApp, PEAL_INBOX_PLATFORMS: "linkedin" }),
        Result.succeed(["linkedin"])
      );
      // A location's reviews, on Google Business Profile's own client.
      assert.deepStrictEqual(
        yield* read({ ...businessApp, PEAL_INBOX_PLATFORMS: "googleBusiness" }),
        Result.succeed(["googleBusiness"])
      );
      // Instagram's own app is a way in of its own.
      assert.deepStrictEqual(
        yield* read({ ...instagramApp, PEAL_INBOX_PLATFORMS: "instagram" }),
        Result.succeed(["instagram"])
      );
    })
  );

  it.effect("stop the server for a name it does not know", () =>
    Effect.gen(function* unknown() {
      const refused = yield* read({
        ...metaApp,
        PEAL_INBOX_PLATFORMS: "mastodon",
      });

      assert.isTrue(Result.isFailure(refused));
      assert.isTrue(
        Result.isFailure(
          yield* read({ ...metaApp, PEAL_INBOX_PLATFORMS: "facebook,threads" })
        )
      );
    })
  );

  it.effect("stop the server for a platform without its app", () =>
    Effect.gen(function* withoutApp() {
      assert.isTrue(
        Result.isFailure(
          yield* read({ ...instagramApp, PEAL_INBOX_PLATFORMS: "facebook" })
        )
      );
      assert.isTrue(
        Result.isFailure(yield* read({ PEAL_INBOX_PLATFORMS: "instagram" }))
      );
      // LinkedIn's comments are a page's: the profile app is not enough.
      assert.isTrue(
        Result.isFailure(
          yield* read({
            LINKEDIN_CLIENT_ID: "88synthetic-profile",
            LINKEDIN_CLIENT_SECRET: "synthetic-linkedin-secret",
            PEAL_INBOX_PLATFORMS: "linkedin",
          })
        )
      );
      // Reviews need Google Business Profile's client, its secret included.
      assert.isTrue(
        Result.isFailure(
          yield* read({ ...youtubeApp, PEAL_INBOX_PLATFORMS: "googleBusiness" })
        )
      );
      assert.isTrue(
        Result.isFailure(
          yield* read({
            GOOGLE_BUSINESS_CLIENT_ID: businessApp.GOOGLE_BUSINESS_CLIENT_ID,
            PEAL_INBOX_PLATFORMS: "googleBusiness",
          })
        )
      );
      // YouTube's comments need YouTube's own client, its secret included.
      assert.isTrue(
        Result.isFailure(
          yield* read({ ...metaApp, PEAL_INBOX_PLATFORMS: "youtube" })
        )
      );
      assert.isTrue(
        Result.isFailure(
          yield* read({
            PEAL_INBOX_PLATFORMS: "youtube",
            YOUTUBE_CLIENT_ID: youtubeApp.YOUTUBE_CLIENT_ID,
          })
        )
      );
    })
  );

  it.effect("name every platform they take when they refuse one", () =>
    Effect.gen(function* refusal() {
      const refused = yield* read({ PEAL_INBOX_PLATFORMS: "threads" }).pipe(
        Effect.map(Result.match({ onFailure: String, onSuccess: String }))
      );

      assert.include(
        refused,
        "facebook, instagram, youtube, linkedin and googleBusiness"
      );
    })
  );
});
