import { assert, describe, it } from "@effect/vitest";
import { Context, DateTime, Duration, Effect, Layer, Option } from "effect";

import type { OutgoingPost } from "#publishing/application/platform-client.ts";
import { GoogleBusinessOptions } from "#publishing/domain/google-business-options.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { MediaRejected } from "#shared/domain/media-rejected.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import { RateLimited } from "#shared/domain/rate-limited.ts";
import { TokenExpired } from "#shared/domain/token-expired.ts";
import {
  businessError,
  businessErrorCodes,
  businessLocationPath,
  fakeGoogleBusinessApi,
  projectRefusal,
  validationError,
} from "#test/publishing/fakes/fake-google-business-api.ts";
import type { FakeGoogleBusinessOptions } from "#test/publishing/fakes/fake-google-business-api.ts";
import {
  dropped,
  headerOf,
  json,
} from "#test/publishing/fakes/platform-server.ts";
import type { PlatformServer } from "#test/publishing/fakes/platform-server.ts";

import {
  attached,
  CredentialLog,
  credentialsOf,
  googleBusinessClientWith,
  outgoing,
  testFile,
} from "./support.ts";
import type { TestFile } from "./support.ts";

// Google, and the client publishing to its synthetic location.
const onGoogle = Effect.fn("test.onGoogle")(function* onGoogle(
  options: {
    readonly api?: FakeGoogleBusinessOptions;
    readonly files?: readonly TestFile[];
    readonly tokens?: readonly string[];
  } = {}
) {
  const google = yield* fakeGoogleBusinessApi(options.api);

  const credentials = yield* Layer.build(
    credentialsOf(
      { accountId: businessLocationPath, platform: "googleBusiness" },
      options.tokens ?? ["ya29.business-1"]
    )
  );

  const client = yield* googleBusinessClientWith({
    api: google.url,
    credentials: Layer.succeedContext(credentials),
    files: options.files ?? [],
  });

  return { client, google, log: Context.get(credentials, CredentialLog) };
});

const post = (fields: Partial<OutgoingPost> = {}) =>
  outgoing({ ...fields, accountId: businessLocationPath });

const withOptions = (
  fields: ConstructorParameters<typeof GoogleBusinessOptions>[0]
) => Option.some(new GoogleBusinessOptions(fields));

const calls = (server: PlatformServer, method: string, path: string) =>
  server
    .requests()
    .filter((request) => request.method === method && request.path === path);

const event = {
  endsAt: "2026-11-27T18:30",
  postType: "event",
  startsAt: "2026-11-27T09:00",
  title: "Synthetic open day",
} as const;

describe("publishing on a Google Business Profile location", () => {
  it.live("posts a standard update, and answers its address on Google", () =>
    Effect.gen(function* postsText() {
      const { client, google } = yield* onGoogle();

      const result = yield* client.publish(
        yield* post({ text: "Fresh synthetic bread, every morning." })
      );

      const [made] = google.posts();
      const [call] = calls(google, "POST", google.collection);

      assert(made !== undefined && call !== undefined);
      assert.deepStrictEqual(made.body, {
        summary: "Fresh synthetic bread, every morning.",
        topicType: "STANDARD",
      });
      assert.deepStrictEqual(result, {
        _tag: "published",
        permalink: `https://local.google.example/place?id=1&use=posts&lpsid=${made.name.split("/").at(-1) ?? ""}`,
        platformPostId: PlatformPostIdSchema.make(made.name),
      });
      assert.strictEqual(
        headerOf(call, "authorization"),
        "Bearer ya29.business-1"
      );
      // Asks for the detail of validation errors.
      assert.strictEqual(headerOf(call, "x-goog-api-format-version"), "2");
    }).pipe(Effect.scoped)
  );

  it.live("hands Google each photo by a public URL, in order", () =>
    Effect.gen(function* photos() {
      const first = testFile("image", 20_480, "image/jpeg");
      const second = testFile("image", 20_480, "image/png");
      const { client, google } = yield* onGoogle({ files: [first, second] });

      yield* client.publish(
        yield* post({ media: [attached(first), attached(second)], text: "" })
      );

      assert.deepStrictEqual(google.posts()[0]?.body, {
        media: [
          {
            mediaFormat: "PHOTO",
            sourceUrl: `https://media.test/${first.media.mediaId}`,
          },
          {
            mediaFormat: "PHOTO",
            sourceUrl: `https://media.test/${second.media.mediaId}`,
          },
        ],
        topicType: "STANDARD",
      });
    }).pipe(Effect.scoped)
  );

  it.live(
    "refuses a video, or a format Google does not take, before any call",
    () =>
      Effect.gen(function* refusesVideo() {
        const video = testFile("video", 4096);
        const webp = testFile("image", 20_480, "image/webp");
        const { client, google } = yield* onGoogle({ files: [video, webp] });

        for (const file of [video, webp]) {
          const refused = yield* client
            .publish(yield* post({ media: [attached(file)] }))
            .pipe(Effect.flip);

          assert.deepStrictEqual(
            refused,
            new MediaRejected({ code: "unsupportedType" })
          );
        }

        assert.deepStrictEqual(google.requests(), []);
      }).pipe(Effect.scoped)
  );

  it.live("posts an event with its schedule and its button", () =>
    Effect.gen(function* postsEvent() {
      const { client, google } = yield* onGoogle();

      const result = yield* client.publish(
        yield* post({
          options: withOptions({
            ...event,
            callToAction: "book",
            callToActionUrl: "https://example.com/book",
          }),
          text: "Come and taste.",
        })
      );

      assert.strictEqual(result._tag, "published");
      assert.deepStrictEqual(google.posts()[0]?.body, {
        callToAction: { actionType: "BOOK", url: "https://example.com/book" },
        event: {
          schedule: {
            endDate: { day: 27, month: 11, year: 2026 },
            endTime: { hours: 18, minutes: 30, nanos: 0, seconds: 0 },
            startDate: { day: 27, month: 11, year: 2026 },
            startTime: { hours: 9, minutes: 0, nanos: 0, seconds: 0 },
          },
          title: "Synthetic open day",
        },
        summary: "Come and taste.",
        topicType: "EVENT",
      });
    }).pipe(Effect.scoped)
  );

  it.live("posts an offer with its code, link and terms, and no button", () =>
    Effect.gen(function* postsOffer() {
      const { client, google } = yield* onGoogle();

      yield* client.publish(
        yield* post({
          options: withOptions({
            ...event,
            couponCode: "SYNTHETIC-10",
            postType: "offer",
            redeemUrl: "https://example.com/redeem",
            terms: "One per synthetic customer.",
          }),
          text: "Ten percent off.",
        })
      );

      const [made] = google.posts();

      assert(made !== undefined);

      const { body } = made;

      assert.strictEqual(body.topicType, "OFFER");
      assert.deepStrictEqual(body.offer, {
        couponCode: "SYNTHETIC-10",
        redeemOnlineUrl: "https://example.com/redeem",
        termsConditions: "One per synthetic customer.",
      });
      assert.strictEqual(body.event?.title, "Synthetic open day");
      assert.isUndefined(body.callToAction);
    }).pipe(Effect.scoped)
  );

  it.live("gives a call button no address", () =>
    Effect.gen(function* callButton() {
      const { client, google } = yield* onGoogle();

      yield* client.publish(
        yield* post({ options: withOptions({ callToAction: "call" }) })
      );

      assert.deepStrictEqual(google.posts()[0]?.body.callToAction, {
        actionType: "CALL",
      });
    }).pipe(Effect.scoped)
  );

  it.live("reads a post Google is processing until it is live", () =>
    Effect.gen(function* processing() {
      const { client, google } = yield* onGoogle({
        api: { states: ["PROCESSING", "PROCESSING", "LIVE"] },
      });

      const result = yield* client.publish(yield* post());
      const [made] = google.posts();

      assert(made !== undefined && result._tag === "published");
      assert.isDefined(result.permalink);
      assert.lengthOf(calls(google, "GET", `/v4/${made.name}`), 2);
      assert.lengthOf(calls(google, "POST", google.collection), 1);
    }).pipe(Effect.scoped)
  );

  it.live("fails a post Google rejects for its content policy", () =>
    Effect.gen(function* rejected() {
      const { client, google } = yield* onGoogle({
        api: { states: ["PROCESSING", "REJECTED"] },
      });

      const refused = yield* client.publish(yield* post()).pipe(Effect.flip);

      assert.deepStrictEqual(refused, new BadRequest({ code: "postRejected" }));
      assert.lengthOf(calls(google, "POST", google.collection), 1);
    }).pipe(Effect.scoped)
  );

  it.live(
    "publishes a post still processing, or one it cannot read again: Google has it",
    () =>
      Effect.gen(function* stillProcessing() {
        const { client, google } = yield* onGoogle({
          api: { states: ["PROCESSING"] },
        });

        const slow = yield* client.publish(yield* post({ text: "Slow." }));
        const [first] = google.posts();

        assert(first !== undefined);
        assert.deepStrictEqual(slow, {
          _tag: "published",
          platformPostId: PlatformPostIdSchema.make(first.name),
        });

        // The reads fail: the post exists all the same.
        const second = `${businessLocationPath}/localPosts/${"7".repeat(18)}2`;

        google.script(`GET /v4/${second}`, [
          businessError(503, "UNAVAILABLE"),
          dropped,
          businessError(429, "RESOURCE_EXHAUSTED"),
        ]);

        assert.deepStrictEqual(
          yield* client.publish(yield* post({ text: "Unread." })),
          {
            _tag: "published",
            platformPostId: PlatformPostIdSchema.make(second),
          }
        );
        assert.lengthOf(calls(google, "POST", google.collection), 2);
      }).pipe(Effect.scoped)
  );

  it.live("waits as Google says once the project's quota is spent", () =>
    Effect.gen(function* quota() {
      const { client, google } = yield* onGoogle();

      google.script(`POST ${google.collection}`, [
        businessError(429, "RESOURCE_EXHAUSTED"),
        projectRefusal("RATE_LIMIT_EXCEEDED"),
        {
          _tag: "answer",
          body: { error: { code: 429, status: "RESOURCE_EXHAUSTED" } },
          headers: { "retry-after": "45" },
          status: 429,
        },
      ]);

      assert.deepStrictEqual(
        yield* client.publish(yield* post()).pipe(Effect.flip),
        new RateLimited({})
      );
      assert.deepStrictEqual(
        yield* client.publish(yield* post()).pipe(Effect.flip),
        new RateLimited({})
      );
      assert.deepStrictEqual(
        yield* client.publish(yield* post()).pipe(Effect.flip),
        new RateLimited({ retryAfter: Duration.seconds(45) })
      );
      assert.deepStrictEqual(google.posts(), []);
    }).pipe(Effect.scoped)
  );

  it.live("renews a refused token once, then asks to reconnect", () =>
    Effect.gen(function* tokens() {
      const renewed = yield* onGoogle({
        tokens: ["ya29.stale", "ya29.business-1"],
      });

      const result = yield* renewed.client.publish(yield* post());

      assert.strictEqual(result._tag, "published");
      assert.strictEqual(yield* renewed.log.renewals, 1);
      assert.lengthOf(renewed.google.posts(), 1);

      const revoked = yield* onGoogle({
        tokens: ["ya29.stale", "ya29.staler"],
      });

      assert.deepStrictEqual(
        yield* revoked.client.publish(yield* post()).pipe(Effect.flip),
        new TokenExpired()
      );
      assert.deepStrictEqual(revoked.google.posts(), []);
    }).pipe(Effect.scoped)
  );

  it.live("says a location cannot post once Google no longer verifies it", () =>
    Effect.gen(function* unverified() {
      const { client, google } = yield* onGoogle({ api: { verified: false } });

      assert.deepStrictEqual(
        yield* client.publish(yield* post()).pipe(Effect.flip),
        new BadRequest({ code: "locationCannotPost" })
      );
      assert.deepStrictEqual(google.posts(), []);
    }).pipe(Effect.scoped)
  );

  it.live("refuses a photo Google could not fetch", () =>
    Effect.gen(function* photoRefused() {
      const photo = testFile("image", 20_480, "image/jpeg");

      const { client } = yield* onGoogle({
        api: { unfetchable: [`https://media.test/${photo.media.mediaId}`] },
        files: [photo],
      });

      assert.deepStrictEqual(
        yield* client
          .publish(yield* post({ media: [attached(photo)] }))
          .pipe(Effect.flip),
        new MediaRejected({
          code: `photoError${businessErrorCodes.photoFetchFailed}`,
        })
      );
    }).pipe(Effect.scoped)
  );

  it.live(
    "tells a lost permission, a missing location and a project without the API apart",
    () =>
      Effect.gen(function* refusals() {
        const { client, google, log } = yield* onGoogle();

        google.script(`POST ${google.collection}`, [
          businessError(403, "PERMISSION_DENIED"),
          businessError(404, "NOT_FOUND"),
          projectRefusal("SERVICE_DISABLED"),
          projectRefusal("ACCESS_TOKEN_SCOPE_INSUFFICIENT"),
          projectRefusal("ACCESS_TOKEN_SCOPE_INSUFFICIENT"),
        ]);

        const refused = () =>
          post().pipe(Effect.flatMap(client.publish), Effect.flip);

        assert.deepStrictEqual(
          yield* refused(),
          new BadRequest({ code: "permissionDenied" })
        );
        assert.deepStrictEqual(
          yield* refused(),
          new BadRequest({ code: "locationNotFound" })
        );
        assert.deepStrictEqual(yield* refused(), new PlatformUnavailable());
        // A scope the token lacks is the token's: renewed, then expired.
        assert.deepStrictEqual(yield* refused(), new TokenExpired());
        assert.strictEqual(yield* log.renewals, 1);
      }).pipe(Effect.scoped)
  );

  it.live(
    "takes a 401 or a 403 that is not Google's own for a server on the way, never for the token or the permission",
    () =>
      Effect.gen(function* proxies() {
        const { client, google, log } = yield* onGoogle();

        google.script(`POST ${google.collection}`, [
          json({ message: "Unauthorized" }, 401),
          json({ error: "Forbidden" }, 403),
        ]);

        const refused = () =>
          post().pipe(Effect.flatMap(client.publish), Effect.flip);

        assert.deepStrictEqual(yield* refused(), new PlatformUnavailable());
        assert.deepStrictEqual(yield* refused(), new PlatformUnavailable());
        // The token was not renewed, nor the channel asked to reconnect.
        assert.strictEqual(yield* log.renewals, 0);
      }).pipe(Effect.scoped)
  );

  it.live("keeps the field Google refused, never its value", () =>
    Effect.gen(function* invalid() {
      const { client, google } = yield* onGoogle();

      google.script(`POST ${google.collection}`, [
        validationError(
          businessErrorCodes.invalidValue,
          "summary",
          "A synthetic text Google refused"
        ),
        businessError(400, "FAILED_PRECONDITION"),
        { _tag: "answer", status: 400 },
      ]);

      const refused = () =>
        post().pipe(Effect.flatMap(client.publish), Effect.flip);

      assert.deepStrictEqual(
        yield* refused(),
        new BadRequest({ code: "INVALID_ARGUMENT:summary" })
      );
      assert.deepStrictEqual(
        yield* refused(),
        new BadRequest({ code: "FAILED_PRECONDITION" })
      );
      assert.deepStrictEqual(
        yield* refused(),
        new BadRequest({ code: "http400" })
      );
    }).pipe(Effect.scoped)
  );

  it.live("refuses a channel whose account is not a location", () =>
    Effect.gen(function* notALocation() {
      const { client, google } = yield* onGoogle();

      assert.deepStrictEqual(
        yield* client
          .publish(yield* outgoing({ accountId: "locations/1/../../v1" }))
          .pipe(Effect.flip),
        new BadRequest({ code: "locationNotFound" })
      );
      assert.deepStrictEqual(google.requests(), []);
    }).pipe(Effect.scoped)
  );

  it.live(
    "finds the post whose answer was lost among the location's, and sends nothing again",
    () =>
      Effect.gen(function* answerLost() {
        const { client, google } = yield* onGoogle();

        // The same text, posted before the attempt, is not its post.
        google.hold(
          { summary: "Open on Sunday.", topicType: "STANDARD" },
          "2026-01-01T08:00:00Z"
        );
        google.script(`POST ${google.collection}`, [
          { _tag: "publishThenDrop" },
        ]);

        const result = yield* client.publish(
          yield* post({ text: "Open on Sunday." })
        );

        const [, made] = google.posts();

        assert(made !== undefined && result._tag === "published");
        assert.strictEqual(result.platformPostId, made.name);
        assert.lengthOf(calls(google, "POST", google.collection), 1);
      }).pipe(Effect.scoped)
  );

  it.live(
    "leaves unconfirmed a post it cannot find, after a lost answer or a server error",
    () =>
      Effect.gen(function* notFound() {
        const { client, google } = yield* onGoogle();

        google.script(`POST ${google.collection}`, [
          dropped,
          businessError(500, "INTERNAL"),
        ]);

        assert.deepStrictEqual(yield* client.publish(yield* post()), {
          _tag: "unconfirmed",
          reason: "noResponse",
        });
        assert.deepStrictEqual(yield* client.publish(yield* post()), {
          _tag: "unconfirmed",
          reason: "noResponse",
        });
        // Each create call was sent once, never again.
        assert.lengthOf(calls(google, "POST", google.collection), 2);
        assert.deepStrictEqual(google.posts(), []);
      }).pipe(Effect.scoped)
  );

  it.live("settles nothing when two posts could be the attempt's", () =>
    Effect.gen(function* ambiguous() {
      const { client, google } = yield* onGoogle();
      const now = DateTime.formatIso(yield* DateTime.now);

      google.hold({ summary: "Twice.", topicType: "STANDARD" }, now);
      google.script(`POST ${google.collection}`, [{ _tag: "publishThenDrop" }]);

      assert.deepStrictEqual(
        yield* client.publish(yield* post({ text: "Twice." })),
        { _tag: "unconfirmed", reason: "noResponse" }
      );
    }).pipe(Effect.scoped)
  );

  it.live(
    "tells an event from an update with the same text, by type and title",
    () =>
      Effect.gen(function* byType() {
        const { client, google } = yield* onGoogle();
        const now = DateTime.formatIso(yield* DateTime.now);

        google.hold({ summary: "Come and taste.", topicType: "STANDARD" }, now);
        google.hold(
          {
            event: { title: "Another day" },
            summary: "Come and taste.",
            topicType: "EVENT",
          },
          now
        );
        google.script(`POST ${google.collection}`, [
          { _tag: "publishThenDrop" },
        ]);

        const result = yield* client.publish(
          yield* post({ options: withOptions(event), text: "Come and taste." })
        );

        assert(result._tag === "published");
        assert.strictEqual(result.platformPostId, google.posts()[2]?.name);
      }).pipe(Effect.scoped)
  );

  it.live("resumes an interrupted attempt by looking for its post", () =>
    Effect.gen(function* resumed() {
      const { client, google } = yield* onGoogle();
      const sent = yield* post({ text: "Back at nine." });

      // Nothing found: unconfirmed, and nothing sent.
      assert.deepStrictEqual(yield* client.resume(sent), {
        _tag: "unconfirmed",
        reason: "interrupted",
      });
      assert.lengthOf(calls(google, "POST", google.collection), 0);

      const made = google.hold(
        { summary: "Back at nine.", topicType: "STANDARD" },
        DateTime.formatIso(yield* DateTime.now)
      );

      const found = yield* client.resume(sent);

      assert(found._tag === "published");
      assert.strictEqual(found.platformPostId, made.name);
      assert.lengthOf(calls(google, "POST", google.collection), 0);
    }).pipe(Effect.scoped)
  );

  it.live(
    "reads the location's posts page after page to find the attempt's",
    () =>
      Effect.gen(function* pages() {
        const { client, google } = yield* onGoogle();
        const sent = yield* post({ text: "The oldest of many." });
        const now = DateTime.formatIso(yield* DateTime.now);

        google.hold(
          { summary: "The oldest of many.", topicType: "STANDARD" },
          now
        );

        for (let index = 0; index < 120; index += 1) {
          google.hold(
            { summary: `Later ${index}`, topicType: "STANDARD" },
            now
          );
        }

        const found = yield* client.resume(sent);

        assert.strictEqual(found._tag, "published");
        assert.deepStrictEqual(
          calls(google, "GET", google.collection).map(({ query }) => [
            query.get("pageSize"),
            query.get("pageToken"),
          ]),
          [
            ["100", null],
            ["100", "100"],
          ]
        );
      }).pipe(Effect.scoped)
  );
});
