import { assert, describe, it } from "@effect/vitest";
import { Context, DateTime, Duration, Effect, Layer, Option } from "effect";

import type { OutgoingPost } from "#publishing/application/platform-client.ts";
import { XOptions } from "#publishing/domain/x-options.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { MediaRejected } from "#shared/domain/media-rejected.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import { fakeXApi, xAccountId } from "#test/publishing/fakes/fake-x-api.ts";
import type { FakeXOptions } from "#test/publishing/fakes/fake-x-api.ts";
import {
  dropped,
  headerOf,
  json,
  textOf,
} from "#test/publishing/fakes/platform-server.ts";
import type { PlatformServer } from "#test/publishing/fakes/platform-server.ts";

import {
  attached,
  CredentialLog,
  credentialsOf,
  outgoing,
  testFile,
  xClientWith,
} from "./support.ts";
import type { TestFile } from "./support.ts";

// X, and the client publishing to it as the synthetic account.
const onX = Effect.fn("test.onX")(function* onX(
  options: {
    readonly api?: FakeXOptions;
    readonly files?: readonly TestFile[];
    readonly tokens?: readonly string[];
  } = {}
) {
  const x = yield* fakeXApi(options.api);

  const credentials = yield* Layer.build(
    credentialsOf(
      { accountId: xAccountId, platform: "x" },
      options.tokens ?? ["x-access-1"]
    )
  );

  const client = yield* xClientWith({
    api: x.url,
    credentials: Layer.succeedContext(credentials),
    files: options.files ?? [],
  });

  return { client, log: Context.get(credentials, CredentialLog), x };
});

const post = (fields: Partial<OutgoingPost>) =>
  outgoing({ ...fields, accountId: xAccountId });

const calls = (server: PlatformServer, method: string, path: string) =>
  server
    .requests()
    .filter((request) => request.method === method && request.path === path);

const mebibyte = 1024 * 1024;

describe("publishing on X", () => {
  it.live("posts the text", () =>
    Effect.gen(function* postsText() {
      const { client, x } = yield* onX();

      const result = yield* client.publish(
        yield* post({ text: "Plain words & a <tag>" })
      );

      const [published] = x.posts();
      const [call] = calls(x, "POST", "/2/tweets");

      assert(published !== undefined && call !== undefined);
      assert.strictEqual(published.text, "Plain words & a <tag>");
      assert.deepStrictEqual(result, {
        _tag: "published",
        permalink: `https://x.com/i/status/${published.id}`,
        platformPostId: PlatformPostIdSchema.make(published.id),
      });
      assert.strictEqual(headerOf(call, "authorization"), "Bearer x-access-1");
    }).pipe(Effect.scoped)
  );

  it.live("uploads images in parts, with their alt text, in order", () =>
    Effect.gen(function* images() {
      const first = testFile("image", 2048, "image/png");
      const second = testFile("image", 1024, "image/jpeg");

      const { client, x } = yield* onX({ files: [first, second] });

      const result = yield* client.publish(
        yield* post({
          media: [attached(first, "A red square"), attached(second, "")],
          text: "",
        })
      );

      const media = x.media();
      const [call] = calls(x, "POST", "/2/tweets");

      assert.strictEqual(result._tag, "published");
      assert.deepStrictEqual(
        media.map(({ altText, category, segments, type }) => ({
          altText,
          category,
          segments,
          type,
        })),
        [
          {
            altText: "A red square",
            category: "tweet_image",
            segments: [2048],
            type: "image/png",
          },
          {
            altText: null,
            category: "tweet_image",
            segments: [1024],
            type: "image/jpeg",
          },
        ]
      );
      assert.deepStrictEqual(
        x.posts()[0]?.mediaIds,
        media.map(({ id }) => id)
      );
      // A post of files alone sends no text.
      assert(call !== undefined);
      assert.notInclude(textOf(call), '"text"');
    }).pipe(Effect.scoped)
  );

  it.live(
    "uploads a video in chunks, and waits as long as X processes it",
    () =>
      Effect.gen(function* video() {
        const clip = testFile("video", 9 * mebibyte);

        const { client, x } = yield* onX({
          api: { videoPolls: 2 },
          files: [clip],
        });

        const result = yield* client.publish(
          yield* post({ media: [attached(clip, "A short clip")] })
        );

        const looks = calls(x, "GET", "/2/media/upload");

        assert.strictEqual(result._tag, "published");
        assert.deepStrictEqual(
          x.media().map(({ altText, category, segments }) => ({
            altText,
            category,
            segments,
          })),
          [
            {
              altText: "A short clip",
              category: "tweet_video",
              segments: [4 * mebibyte, 4 * mebibyte, mebibyte],
            },
          ]
        );
        assert.lengthOf(looks, 3);
        assert.isTrue(
          looks.every(({ query }) => query.get("command") === "STATUS")
        );
      }).pipe(Effect.scoped)
  );

  it.live("posts a video whose alt text X would not take", () =>
    Effect.gen(function* undescribed() {
      const clip = testFile("video", 4096);

      const { client, x } = yield* onX({
        api: { describesVideos: false, videoPolls: 0 },
        files: [clip],
      });

      const result = yield* client.publish(
        yield* post({ media: [attached(clip, "A short clip")] })
      );

      assert.strictEqual(result._tag, "published");
      assert.isNull(x.media()[0]?.altText);
    }).pipe(Effect.scoped)
  );

  it.live("refuses a video X could not process", () =>
    Effect.gen(function* failed() {
      const clip = testFile("video", 4096);

      const { client, x } = yield* onX({
        api: { videoFails: true, videoPolls: 1 },
        files: [clip],
      });

      const failure = yield* client
        .publish(yield* post({ media: [attached(clip)] }))
        .pipe(Effect.flip);

      assert.deepStrictEqual(
        failure,
        new MediaRejected({ code: "InvalidMedia" })
      );
      assert.lengthOf(calls(x, "POST", "/2/tweets"), 0);
    }).pipe(Effect.scoped)
  );

  it.live("refuses a GIF or a video with other files, before uploading", () =>
    Effect.gen(function* mixed() {
      const gif = testFile("image", 1024, "image/gif");
      const photo = testFile("image", 1024, "image/png");

      const { client, x } = yield* onX({ files: [gif, photo] });

      const failure = yield* client
        .publish(yield* post({ media: [attached(gif), attached(photo)] }))
        .pipe(Effect.flip);

      assert.deepStrictEqual(
        failure,
        new MediaRejected({ code: "mixedMedia" })
      );
      assert.lengthOf(x.requests(), 0);
    }).pipe(Effect.scoped)
  );

  it.live("posts with the renewed token once X refused the first", () =>
    Effect.gen(function* renewed() {
      const { client, log, x } = yield* onX({
        tokens: ["x-access-expired", "x-access-1"],
      });

      const result = yield* client.publish(yield* post({}));

      assert.strictEqual(result._tag, "published");
      assert.strictEqual(yield* log.renewals, 1);
      assert.deepStrictEqual(yield* log.handed, [
        "x-access-expired",
        "x-access-1",
      ]);
      assert.lengthOf(x.posts(), 1);
    }).pipe(Effect.scoped)
  );

  it.live("waits until the spent window of X's rate limits resets", () =>
    Effect.gen(function* rateLimited() {
      const { client, x } = yield* onX();
      const now = yield* DateTime.now;

      const inSeconds = (minutes: number) =>
        String(Math.floor(DateTime.toEpochMillis(now) / 1000) + minutes * 60);

      x.script("POST /2/tweets", [
        json(
          {
            detail: "Too Many Requests",
            status: 429,
            title: "Too Many Requests",
            type: "about:blank",
          },
          429,
          {
            "x-rate-limit-remaining": "40",
            "x-rate-limit-reset": inSeconds(10),
            "x-user-limit-24hour-remaining": "0",
            "x-user-limit-24hour-reset": inSeconds(180),
          }
        ),
      ]);

      const failure = yield* client.publish(yield* post({})).pipe(Effect.flip);

      assert(failure._tag === "RateLimited");
      assert(failure.retryAfter !== undefined);
      assert.isTrue(
        Duration.isGreaterThan(failure.retryAfter, Duration.minutes(179)) &&
          Duration.isLessThanOrEqualTo(
            failure.retryAfter,
            Duration.minutes(180)
          )
      );
      assert.lengthOf(x.posts(), 0);
    }).pipe(Effect.scoped)
  );

  it.live(
    "tells a spending cap, used-up credits, a duplicate, a refused post and an outage apart",
    () =>
      Effect.gen(function* failures() {
        const image = testFile("image", 512, "image/png");
        const { client, x } = yield* onX({ files: [image] });

        yield* client.publish(yield* post({ text: "Said once" }));

        x.script("POST /2/tweets", [
          json(
            {
              detail: "Your enrolled account has reached its usage cap.",
              status: 429,
              title: "Usage Capped",
              type: "https://api.x.com/2/problems/usage-capped",
            },
            429
          ),
          json(
            {
              detail: "Your account has no credits left.",
              status: 402,
              title: "Payment Required",
            },
            402
          ),
          json(
            {
              detail: "One or more parameters to your request was invalid.",
              status: 400,
              title: "Invalid Request",
              type: "https://api.x.com/2/problems/invalid-request",
            },
            400
          ),
        ]);
        x.script("POST /2/media/upload/initialize", [
          json({ title: "Service Unavailable" }, 503),
        ]);

        const outcomes = yield* Effect.all(
          [
            { text: "Capped" },
            { text: "No credits" },
            { text: "Invalid" },
            { text: "Said once" },
            { media: [attached(image)], text: "With a picture" },
          ].map((fields) =>
            post(fields).pipe(
              Effect.flatMap((outgoingPost) =>
                client.publish(outgoingPost).pipe(Effect.flip)
              )
            )
          )
        );

        assert.deepStrictEqual(outcomes, [
          new PlatformUnavailable({ code: "usageCapped" }),
          new PlatformUnavailable({ code: "creditsDepleted" }),
          new BadRequest({ code: "invalid-request" }),
          new BadRequest({ code: "duplicate" }),
          new PlatformUnavailable(),
        ]);
        assert.lengthOf(x.posts(), 1);
      }).pipe(Effect.scoped)
  );

  it.live(
    "confirms a post whose answer was lost among the account's recent posts",
    () =>
      Effect.gen(function* lost() {
        const image = testFile("image", 512, "image/png");
        const { client, x } = yield* onX({ files: [image] });

        x.script("POST /2/tweets", [{ _tag: "publishThenDrop" }]);

        const result = yield* client.publish(
          yield* post({
            media: [attached(image)],
            text: "Read https://peal.social/launch & share",
          })
        );

        const [published] = x.posts();
        const [search] = calls(x, "GET", `/2/users/${xAccountId}/tweets`);

        assert(published !== undefined && search !== undefined);
        assert.deepStrictEqual(result, {
          _tag: "published",
          permalink: `https://x.com/i/status/${published.id}`,
          platformPostId: PlatformPostIdSchema.make(published.id),
        });
        assert.lengthOf(calls(x, "POST", "/2/tweets"), 1);
        assert.match(
          search.query.get("start_time") ?? "",
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u
        );
      }).pipe(Effect.scoped)
  );

  it.live("sends a later part as a reply to the part before it", () =>
    Effect.gen(function* repliesInThread() {
      const { client, x } = yield* onX();
      const first = yield* client.publish(yield* post({ text: "A first" }));

      assert(first._tag === "published");

      const second = yield* client.publish(
        yield* post({
          part: 1,
          replyTo: Option.some({
            parent: first.platformPostId,
            root: first.platformPostId,
          }),
          text: "A second",
        })
      );

      assert(second._tag === "published");

      const third = yield* client.publish(
        yield* post({
          part: 2,
          replyTo: Option.some({
            parent: second.platformPostId,
            root: first.platformPostId,
          }),
          text: "A third",
        })
      );

      assert.strictEqual(third._tag, "published");
      assert.deepStrictEqual(
        x.posts().map(({ inReplyTo, text }) => [text, inReplyTo]),
        [
          ["A first", null],
          ["A second", first.platformPostId],
          ["A third", second.platformPostId],
        ]
      );
    }).pipe(Effect.scoped)
  );

  it.live(
    "tells a reply X does not let this app post from a post it refused",
    () =>
      Effect.gen(function* refusesReply() {
        const { client, x } = yield* onX();
        const first = yield* client.publish(yield* post({ text: "A first" }));

        assert(first._tag === "published");

        // X's words for a reply its self-serve access does not allow: the
        // replying account was not summoned by the post's author.
        const notAllowed = json(
          {
            detail:
              "Reply to this conversation is not allowed because you have not been mentioned or otherwise engaged by the author of the post you are replying to.",
            status: 403,
            title: "Forbidden",
            type: "about:blank",
          },
          403
        );

        x.script("POST /2/tweets", [notAllowed, notAllowed]);

        const reply = yield* post({
          part: 1,
          replyTo: Option.some({
            parent: first.platformPostId,
            root: first.platformPostId,
          }),
          text: "A second",
        });

        assert.deepStrictEqual(
          yield* client.publish(reply).pipe(Effect.flip),
          new BadRequest({ code: "repliesNotAllowed" })
        );

        // The same refusal of a post alone is X's refusal of the post.
        assert.deepStrictEqual(
          yield* client
            .publish(yield* post({ text: "Alone" }))
            .pipe(Effect.flip),
          new BadRequest({ code: "http403" })
        );
      }).pipe(Effect.scoped)
  );

  it.live(
    "finds a lost reply whose text X shows after the mentions it inherits, under either name of its references",
    () =>
      Effect.gen(function* inherited() {
        const { client, x } = yield* onX();
        const first = yield* client.publish(yield* post({ text: "A first" }));

        assert(first._tag === "published");

        const text = "A second";
        const shown = `@reader.example ${text}`;

        // X's newer reference names the post's references
        // `referenced_posts`, and its text may begin with the mentions of
        // the conversation, which `display_text_range` leaves out.
        x.script("GET /2/users/:id/tweets", [
          json({
            data: [
              {
                display_text_range: [shown.length - text.length, shown.length],
                id: "1900000000000000999",
                referenced_posts: [
                  { id: first.platformPostId, type: "replied_to" },
                ],
                text: shown,
              },
            ],
          }),
        ]);

        const found = yield* client.resume(
          yield* post({
            part: 1,
            replyTo: Option.some({
              parent: first.platformPostId,
              root: first.platformPostId,
            }),
            text,
          })
        );

        assert.strictEqual(found._tag, "published");
      }).pipe(Effect.scoped)
  );

  it.live(
    "finds a lost reply among the account's replies, by the post it answers",
    () =>
      Effect.gen(function* lostReply() {
        const { client, x } = yield* onX();
        const first = yield* client.publish(yield* post({ text: "A first" }));

        assert(first._tag === "published");

        // Another reply with the same words, under another post.
        const other = yield* client.publish(yield* post({ text: "Another" }));

        assert(other._tag === "published");

        x.script("POST /2/tweets", [{ _tag: "publishThenDrop" }]);

        const reply = yield* post({
          part: 1,
          replyTo: Option.some({
            parent: first.platformPostId,
            root: first.platformPostId,
          }),
          text: "A second",
        });

        const result = yield* client.publish(reply);
        const published = x.posts().at(-1);

        assert(published !== undefined);
        assert.deepStrictEqual(result, {
          _tag: "published",
          permalink: `https://x.com/i/status/${published.id}`,
          platformPostId: PlatformPostIdSchema.make(published.id),
        });

        // Sent once, and found among the replies.
        assert.lengthOf(calls(x, "POST", "/2/tweets"), 3);

        const search = calls(x, "GET", `/2/users/${xAccountId}/tweets`).at(-1);

        assert.strictEqual(search?.query.get("exclude"), "retweets");

        // The same words answering another post are not this part.
        const elsewhere = yield* client.resume(
          yield* post({
            part: 1,
            replyTo: Option.some({
              parent: other.platformPostId,
              root: other.platformPostId,
            }),
            text: "A second",
          })
        );

        assert.deepStrictEqual(elsewhere, {
          _tag: "unconfirmed",
          reason: "interrupted",
        });
      }).pipe(Effect.scoped)
  );

  it.live(
    "never sends again a post it cannot find, and leaves it unconfirmed",
    () =>
      Effect.gen(function* notFound() {
        const { client, x } = yield* onX();

        x.script("POST /2/tweets", [dropped]);

        const result = yield* client.publish(yield* post({}));

        assert.deepStrictEqual(result, {
          _tag: "unconfirmed",
          reason: "noResponse",
        });
        assert.lengthOf(calls(x, "POST", "/2/tweets"), 1);
        assert.lengthOf(calls(x, "GET", `/2/users/${xAccountId}/tweets`), 3);
        assert.lengthOf(x.posts(), 0);
      }).pipe(Effect.scoped)
  );

  it.live(
    "never takes a recent post that links elsewhere for the one it lost",
    () =>
      Effect.gen(function* linksElsewhere() {
        const { client, x } = yield* onX();

        yield* client.publish(
          yield* post({ text: "New article: https://peal.social/one" })
        );

        x.script("POST /2/tweets", [dropped]);

        // The same words, another link: X made nothing of it.
        const result = yield* client.publish(
          yield* post({ text: "New article: https://peal.social/two." })
        );

        assert.deepStrictEqual(result, {
          _tag: "unconfirmed",
          reason: "noResponse",
        });
        assert.lengthOf(x.posts(), 1);
      }).pipe(Effect.scoped)
  );

  it.live(
    "never takes a recent post of other pictures for the one it lost",
    () =>
      Effect.gen(function* otherPictures() {
        const first = testFile("image", 512, "image/png");
        const second = testFile("image", 768, "image/png");
        const { client, x } = yield* onX({ files: [first, second] });

        yield* client.publish(
          yield* post({ media: [attached(first)], text: "" })
        );

        x.script("POST /2/tweets", [dropped]);

        // Pictures alone too, but others: X made nothing of it.
        const result = yield* client.publish(
          yield* post({ media: [attached(second)], text: "" })
        );

        assert.deepStrictEqual(result, {
          _tag: "unconfirmed",
          reason: "noResponse",
        });
        assert.lengthOf(x.posts(), 1);
      }).pipe(Effect.scoped)
  );

  it.live("finds the lost post by its links, however X writes them", () =>
    Effect.gen(function* sameLinks() {
      const { client, x } = yield* onX();

      x.script("POST /2/tweets", [{ _tag: "publishThenDrop" }]);

      const result = yield* client.publish(
        yield* post({
          text: "Read (https://Peal.social), https://peal.social/two. and peal.social/three",
        })
      );

      const [published] = x.posts();

      assert(published !== undefined);
      assert.deepStrictEqual(result, {
        _tag: "published",
        permalink: `https://x.com/i/status/${published.id}`,
        platformPostId: PlatformPostIdSchema.make(published.id),
      });
    }).pipe(Effect.scoped)
  );

  it.live("resumes an interrupted attempt by looking for its post", () =>
    Effect.gen(function* resumed() {
      const { client, x } = yield* onX();
      const sent = yield* post({ text: "Went out before the restart" });

      // Nothing found: unconfirmed, and nothing sent.
      assert.deepStrictEqual(yield* client.resume(sent), {
        _tag: "unconfirmed",
        reason: "interrupted",
      });

      yield* client.publish(sent);

      const [published] = x.posts();

      assert.deepStrictEqual(yield* client.resume(sent), {
        _tag: "published",
        permalink: `https://x.com/i/status/${published?.id ?? ""}`,
        platformPostId: PlatformPostIdSchema.make(published?.id ?? "missing"),
      });
      assert.lengthOf(calls(x, "POST", "/2/tweets"), 1);
    }).pipe(Effect.scoped)
  );
});

const tweetBodies = (x: PlatformServer) =>
  calls(x, "POST", "/2/tweets").map((call) => textOf(call));

const everyOption = new XOptions({
  communityId: "1700000000000000001",
  madeWithAi: true,
  paidPartnership: true,
  replySettings: "mentionedUsers",
  shareWithFollowers: true,
});

describe("an X post's options", () => {
  it.live("send the post as before when none is chosen", () =>
    Effect.gen(function* plain() {
      const { client, x } = yield* onX();

      yield* client.publish(
        yield* post({
          options: Option.some(
            new XOptions({ madeWithAi: false, paidPartnership: false })
          ),
          text: "Plain words",
        })
      );

      assert.deepStrictEqual(tweetBodies(x), [
        JSON.stringify({ text: "Plain words" }),
      ]);
    }).pipe(Effect.scoped)
  );

  it.live(
    "give the first part who may reply, its community and the labels, and later parts the labels alone",
    () =>
      Effect.gen(function* thread() {
        const image = testFile("image", 2048, "image/png");
        const { client, x } = yield* onX({ files: [image] });
        const options = Option.some(everyOption);

        const first = yield* client.publish(
          yield* post({ media: [attached(image)], options, text: "A first" })
        );

        assert(first._tag === "published");

        const replyTo = Option.some({
          parent: first.platformPostId,
          root: first.platformPostId,
        });

        yield* client.publish(
          yield* post({
            idempotencyKey: "0b5e4f2a9c7d4e1f8a3b6c5d2e1f0a9b",
            options,
            part: 1,
            replyTo,
            text: "A second, without media",
          })
        );

        const [opening, reply] = x.posts();

        assert.deepStrictEqual(opening?.options, {
          community_id: "1700000000000000001",
          made_with_ai: true,
          paid_partnership: true,
          reply_settings: "mentionedUsers",
          share_with_followers: true,
        });
        // AI-generated media is about media: a part without any says nothing.
        assert.deepStrictEqual(reply?.options, { paid_partnership: true });
      }).pipe(Effect.scoped)
  );

  it.live(
    "end a post X refuses for its options as refused, once, with a stable code",
    () =>
      Effect.gen(function* refused() {
        const { client, x } = yield* onX();

        x.script("POST /2/tweets", [
          json(
            {
              detail: "You are not permitted to perform this action.",
              status: 403,
              title: "Forbidden",
              type: "about:blank",
            },
            403
          ),
          json(
            {
              detail: "One or more parameters to your request was invalid.",
              status: 400,
              title: "Invalid Request",
              type: "https://api.x.com/2/problems/invalid-request",
            },
            400
          ),
        ]);

        const refusals = yield* Effect.forEach(
          [
            new XOptions({ replySettings: "subscribers" }),
            new XOptions({ communityId: "1700000000000000001" }),
          ],
          (options, index) =>
            post({
              idempotencyKey: `0b5e4f2a9c7d4e1f8a3b6c5d2e1f0a${String(index)}0`,
              options: Option.some(options),
              text: `Refused ${String(index)}`,
            }).pipe(
              Effect.flatMap((refusedPost) =>
                client.publish(refusedPost).pipe(Effect.flip)
              )
            )
        );

        assert.deepStrictEqual(refusals, [
          new BadRequest({ code: "optionRefused" }),
          new BadRequest({ code: "optionRefused" }),
        ]);
        assert.lengthOf(calls(x, "POST", "/2/tweets"), 2);
        assert.lengthOf(x.posts(), 0);
      }).pipe(Effect.scoped)
  );

  it.live("leave a refusal of a post without options as it was", () =>
    Effect.gen(function* withoutOptions() {
      const { client, x } = yield* onX();

      x.script("POST /2/tweets", [
        json(
          {
            detail: "You are not permitted to perform this action.",
            status: 403,
            title: "Forbidden",
            type: "about:blank",
          },
          403
        ),
      ]);

      assert.deepStrictEqual(
        yield* client
          .publish(
            yield* post({
              options: Option.some(new XOptions({ paidPartnership: false })),
              text: "Alone",
            })
          )
          .pipe(Effect.flip),
        new BadRequest({ code: "http403" })
      );
    }).pipe(Effect.scoped)
  );
});
