import { assert, describe, it } from "@effect/vitest";
import { Context, DateTime, Duration, Effect, Layer } from "effect";

import type { OutgoingPost } from "#publishing/application/platform-client.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { MediaRejected } from "#shared/domain/media-rejected.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import { TokenExpired } from "#shared/domain/token-expired.ts";
import {
  fakeLinkedInApi,
  linkedinMemberId,
  linkedinTestVersion,
} from "#test/publishing/fakes/fake-linkedin-api.ts";
import type { FakeLinkedInOptions } from "#test/publishing/fakes/fake-linkedin-api.ts";
import { headerOf, json } from "#test/publishing/fakes/platform-server.ts";
import type { PlatformServer } from "#test/publishing/fakes/platform-server.ts";

import {
  attached,
  CredentialLog,
  credentialsOf,
  linkedinClientWith,
  outgoing,
  testFile,
} from "./support.ts";
import type { TestFile } from "./support.ts";

// LinkedIn, and the client publishing to it as the synthetic member.
const onLinkedIn = Effect.fn("test.onLinkedIn")(function* onLinkedIn(
  options: {
    readonly api?: FakeLinkedInOptions;
    readonly files?: readonly TestFile[];
    readonly tokens?: readonly string[];
  } = {}
) {
  const linkedin = yield* fakeLinkedInApi(options.api);

  const credentials = yield* Layer.build(
    credentialsOf(
      { accountId: linkedinMemberId, platform: "linkedin" },
      options.tokens ?? ["linkedin-token-1"]
    )
  );

  const client = yield* linkedinClientWith({
    api: linkedin.url,
    credentials: Layer.succeedContext(credentials),
    files: options.files ?? [],
    version: linkedinTestVersion,
  });

  return { client, linkedin, log: Context.get(credentials, CredentialLog) };
});

const post = (fields: Partial<OutgoingPost>) =>
  outgoing({ ...fields, accountId: linkedinMemberId });

const postCalls = (server: PlatformServer) =>
  server
    .requests()
    .filter(
      (request) => request.method === "POST" && request.path === "/rest/posts"
    );

describe("publishing on LinkedIn", () => {
  it.live("posts the text as the member, in the pinned API version", () =>
    Effect.gen(function* postsText() {
      const { client, linkedin } = yield* onLinkedIn();

      const result = yield* client.publish(
        yield* post({ text: "Launch (beta) at 10:00 #launch @friend" })
      );

      const [published] = linkedin.posts();
      const [call] = postCalls(linkedin);

      assert(published !== undefined && call !== undefined);
      assert.strictEqual(
        published.body.commentary,
        "Launch \\(beta\\) at 10:00 {hashtag|\\#|launch} \\@friend"
      );
      assert.strictEqual(
        published.body.author,
        `urn:li:person:${linkedinMemberId}`
      );
      assert.isUndefined(published.body.content);
      assert.deepStrictEqual(result, {
        _tag: "published",
        permalink: `https://www.linkedin.com/feed/update/${published.urn}/`,
        platformPostId: PlatformPostIdSchema.make(published.urn),
      });
      assert.strictEqual(headerOf(call, "linkedin-version"), "202610");
      assert.strictEqual(headerOf(call, "x-restli-protocol-version"), "2.0.0");
      assert.strictEqual(
        headerOf(call, "authorization"),
        "Bearer linkedin-token-1"
      );
    }).pipe(Effect.scoped)
  );

  it.live("uploads an image, then shows it with its alt text", () =>
    Effect.gen(function* oneImage() {
      const image = testFile("image", 2048, "image/jpeg");
      const { client, linkedin } = yield* onLinkedIn({ files: [image] });

      const result = yield* client.publish(
        yield* post({ media: [attached(image, "A red square")] })
      );

      const [stored] = linkedin.images();

      assert.strictEqual(result._tag, "published");
      assert.deepStrictEqual(stored, {
        authorized: true,
        bytes: 2048,
        urn: "urn:li:image:C4E10AQ1",
      });
      assert.deepStrictEqual(linkedin.posts()[0]?.body.content, {
        media: { altText: "A red square", id: "urn:li:image:C4E10AQ1" },
      });
    }).pipe(Effect.scoped)
  );

  it.live("shows several images together, in order", () =>
    Effect.gen(function* images() {
      const first = testFile("image", 1024, "image/png");
      const second = testFile("image", 512, "image/gif");

      const { client, linkedin } = yield* onLinkedIn({
        files: [first, second],
      });

      yield* client.publish(
        yield* post({
          media: [attached(first, "First"), attached(second, "")],
        })
      );

      assert.deepStrictEqual(linkedin.posts()[0]?.body.content, {
        multiImage: {
          images: [
            { altText: "First", id: "urn:li:image:C4E10AQ1" },
            { id: "urn:li:image:C4E10AQ2" },
          ],
        },
      });
    }).pipe(Effect.scoped)
  );

  it.live(
    "uploads a video in the parts LinkedIn asks for, and waits for it",
    () =>
      Effect.gen(function* video() {
        const clip = testFile("video", 250_000);

        const { client, linkedin } = yield* onLinkedIn({
          api: { partSize: 100_000, videoPolls: 2 },
          files: [clip],
        });

        const result = yield* client.publish(
          yield* post({ media: [attached(clip)] })
        );

        const looks = linkedin
          .requests()
          .filter(({ path }) => path.startsWith("/rest/videos/urn"));

        const parts = linkedin
          .requests()
          .filter(({ path }) => path.startsWith("/dms-uploads/video/"));

        assert.strictEqual(result._tag, "published");
        assert.deepStrictEqual(linkedin.videos(), [
          {
            parts: [100_000, 100_000, 50_000],
            status: "AVAILABLE",
            urn: "urn:li:video:D5E10AQ1",
          },
        ]);
        assert.lengthOf(looks, 3);
        // The presigned part URLs are not sent the member's token.
        assert.isTrue(
          parts.every((part) => headerOf(part, "authorization") === "")
        );
        assert.deepStrictEqual(linkedin.posts()[0]?.body.content, {
          media: { id: "urn:li:video:D5E10AQ1" },
        });
      }).pipe(Effect.scoped)
  );

  it.live(
    "waits a while, then posts a video the member's token cannot read back",
    () =>
      Effect.gen(function* blind() {
        const clip = testFile("video", 120_000);

        const { client, linkedin } = yield* onLinkedIn({
          api: { videoPolls: 2, videoReadable: false },
          files: [clip],
        });

        const result = yield* client.publish(
          yield* post({ media: [attached(clip)] })
        );

        assert.strictEqual(result._tag, "published");
        assert.lengthOf(
          linkedin
            .requests()
            .filter(({ path }) => path.startsWith("/rest/videos/urn")),
          6
        );
      }).pipe(Effect.scoped)
  );

  it.live("tries again later when the unread video was not ready yet", () =>
    Effect.gen(function* notReady() {
      const clip = testFile("video", 120_000);

      const { client, linkedin } = yield* onLinkedIn({
        api: { videoPolls: 10, videoReadable: false },
        files: [clip],
      });

      const failure = yield* client
        .publish(yield* post({ media: [attached(clip)] }))
        .pipe(Effect.flip);

      // LinkedIn refused the post for now: nothing went live.
      assert.deepStrictEqual(failure, new PlatformUnavailable());
      assert.lengthOf(postCalls(linkedin), 1);
      assert.lengthOf(linkedin.posts(), 0);
    }).pipe(Effect.scoped)
  );

  it.live("refuses a video LinkedIn could not process", () =>
    Effect.gen(function* failed() {
      const clip = testFile("video", 120_000);

      const { client, linkedin } = yield* onLinkedIn({
        api: { videoFails: true, videoPolls: 1 },
        files: [clip],
      });

      const failure = yield* client
        .publish(yield* post({ media: [attached(clip)] }))
        .pipe(Effect.flip);

      assert.deepStrictEqual(
        failure,
        new MediaRejected({ code: "INVALID_VIDEO_FORMAT" })
      );
      assert.lengthOf(postCalls(linkedin), 0);
    }).pipe(Effect.scoped)
  );

  it.live("refuses what LinkedIn would, before uploading anything", () =>
    Effect.gen(function* refused() {
      const image = testFile("image", 512, "image/webp");
      const tiny = testFile("video", 4096);
      const clip = testFile("video", 120_000);
      const photo = testFile("image", 512, "image/png");

      const { client, linkedin } = yield* onLinkedIn({
        files: [image, tiny, clip, photo],
      });

      const failures = yield* Effect.all(
        [[image], [tiny], [clip, photo]].map((files) =>
          post({ media: files.map((file) => attached(file)) }).pipe(
            Effect.flatMap((outgoingPost) =>
              client.publish(outgoingPost).pipe(Effect.flip)
            )
          )
        )
      );

      assert.deepStrictEqual(failures, [
        new MediaRejected({ code: "unsupportedType" }),
        new MediaRejected({ code: "tooSmall" }),
        new MediaRejected({ code: "videoWithOtherMedia" }),
      ]);
      assert.lengthOf(linkedin.requests(), 0);
    }).pipe(Effect.scoped)
  );

  it.live("sends the member's token to LinkedIn's hosts only", () =>
    Effect.gen(function* foreignHost() {
      const image = testFile("image", 512, "image/png");

      const { client, linkedin } = yield* onLinkedIn({
        api: { uploadOrigin: "https://uploads.elsewhere.example" },
        files: [image],
      });

      const failure = yield* client
        .publish(yield* post({ media: [attached(image)] }))
        .pipe(Effect.flip);

      assert.deepStrictEqual(
        failure,
        new MediaRejected({ code: "uploadUrlNotAllowed" })
      );
      assert.lengthOf(postCalls(linkedin), 0);
    }).pipe(Effect.scoped)
  );

  it.live("asks for a reconnect when LinkedIn refuses the token", () =>
    Effect.gen(function* refusedToken() {
      const { client, linkedin, log } = yield* onLinkedIn({
        tokens: ["linkedin-token-revoked"],
      });

      const failure = yield* client.publish(yield* post({})).pipe(Effect.flip);

      assert.deepStrictEqual(failure, new TokenExpired());
      assert.strictEqual(yield* log.renewals, 1);
      assert.lengthOf(linkedin.posts(), 0);
    }).pipe(Effect.scoped)
  );

  it.live("waits for the daily reset when LinkedIn rate limits", () =>
    Effect.gen(function* rateLimited() {
      const { client, linkedin } = yield* onLinkedIn();

      linkedin.script("POST /rest/posts", [
        json({ message: "Too many requests", status: 429 }, 429),
      ]);

      const now = yield* DateTime.now;
      const failure = yield* client.publish(yield* post({})).pipe(Effect.flip);

      const midnight = now.pipe(
        DateTime.add({ days: 1 }),
        DateTime.startOf("day")
      );

      assert(failure._tag === "RateLimited");
      assert(failure.retryAfter !== undefined);
      assert.isTrue(
        Duration.isLessThanOrEqualTo(
          failure.retryAfter,
          DateTime.distance(now, midnight)
        ) &&
          Duration.isGreaterThan(
            failure.retryAfter,
            Duration.subtract(
              DateTime.distance(now, midnight),
              Duration.minutes(1)
            )
          )
      );
    }).pipe(Effect.scoped)
  );

  it.live("tells refused posts, a retired version and an outage apart", () =>
    Effect.gen(function* failures() {
      const image = testFile("image", 512, "image/png");
      const { client, linkedin } = yield* onLinkedIn({ files: [image] });

      linkedin.script("POST /rest/posts", [
        json(
          {
            code: "FIELD_LENGTH_TOO_LONG",
            message: "commentary is too long",
            status: 422,
          },
          422
        ),
        json(
          {
            message: "Content is a duplicate of urn:li:share:1",
            status: 422,
          },
          422
        ),
        json({ code: "VERSION_NOT_SUPPORTED", status: 426 }, 426),
        json(
          {
            errorDetailType: "com.linkedin.common.error.BadRequest",
            errorDetails: {
              inputErrors: [{ code: "INVALID_URN_TYPE", description: "x" }],
            },
            message: "Invalid input",
            status: 400,
          },
          400
        ),
      ]);
      linkedin.script("POST /rest/images?action=initializeUpload", [
        json({ message: "Internal error", status: 503 }, 503),
      ]);

      const outcomes = yield* Effect.all(
        [{}, {}, {}, {}, { media: [attached(image)] }].map((fields) =>
          post(fields).pipe(
            Effect.flatMap((outgoingPost) =>
              client.publish(outgoingPost).pipe(Effect.flip)
            )
          )
        )
      );

      assert.deepStrictEqual(outcomes, [
        new BadRequest({ code: "FIELD_LENGTH_TOO_LONG" }),
        new BadRequest({ code: "duplicate" }),
        new BadRequest({ code: "apiVersionRetired" }),
        new BadRequest({ code: "INVALID_URN_TYPE" }),
        new PlatformUnavailable(),
      ]);
      assert.lengthOf(linkedin.posts(), 0);
    }).pipe(Effect.scoped)
  );

  it.live(
    "leaves a post whose answer was lost unconfirmed, and never sends it again",
    () =>
      Effect.gen(function* lost() {
        const { client, linkedin } = yield* onLinkedIn();

        linkedin.script("POST /rest/posts", [{ _tag: "publishThenDrop" }]);

        const result = yield* client.publish(yield* post({}));

        assert.deepStrictEqual(result, {
          _tag: "unconfirmed",
          reason: "noResponse",
        });
        assert.lengthOf(postCalls(linkedin), 1);
        assert.lengthOf(linkedin.posts(), 1);

        // LinkedIn failing on the post itself leaves it unknown too.
        linkedin.script("POST /rest/posts", [
          json({ message: "Internal error", status: 500 }, 500),
        ]);

        assert.deepStrictEqual(yield* client.publish(yield* post({})), {
          _tag: "unconfirmed",
          reason: "noResponse",
        });
        assert.lengthOf(postCalls(linkedin), 2);
      }).pipe(Effect.scoped)
  );

  it.live(
    "answers unconfirmed for an interrupted attempt, sending nothing",
    () =>
      Effect.gen(function* resumed() {
        const { client, linkedin } = yield* onLinkedIn();

        const result = yield* client.resume(yield* post({}));

        assert.deepStrictEqual(result, {
          _tag: "unconfirmed",
          reason: "interrupted",
        });
        assert.lengthOf(linkedin.requests(), 0);
      }).pipe(Effect.scoped)
  );
});
