import { assert, describe, it } from "@effect/vitest";
import { DateTime, Duration, Effect, Option } from "effect";

import type { PlatformClient } from "#publishing/application/platform-client.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import {
  dropped,
  json,
  platformServer,
  textOf,
} from "#test/publishing/fakes/platform-server.ts";
import type {
  PlatformAnswer,
  PlatformRequest,
  PlatformServer,
} from "#test/publishing/fakes/platform-server.ts";

import {
  credentialsOf,
  emptyLedger,
  linkedinClientWith,
  metaClientWith,
  outgoing,
  youtubeClientWith,
} from "./support.ts";

// A first comment, the part after a post's first on a platform whose parts
// are comments: sent once under the post, and on a lost answer or a
// resumed run looked for among the post's comments, never sent again.

const root = PlatformPostIdSchema.make("synthetic-root-post");

const commentText = "The first comment, with the link";

// A platform that answers the comment's request with `made`, or drops it,
// and lists `listed` under the post.
const fakeWith = (handle: (request: PlatformRequest) => PlatformAnswer) =>
  platformServer((request) => handle(request));

const posted = (server: PlatformServer, path: string) =>
  server
    .requests()
    .filter((request) => request.method === "POST" && request.path === path);

// The comment part as the router hands it over: the post it goes under.
const commentPart = (accountId: string, startedAt?: DateTime.Utc) =>
  outgoing({
    accountId,
    part: 1,
    replyTo: Option.some({ parent: root, root }),
    text: commentText,
  }).pipe(
    Effect.map((post) =>
      startedAt === undefined ? post : { ...post, startedAt }
    )
  );

const pageId = "102000000000001";

const facebookOn = (server: PlatformServer) =>
  metaClientWith({
    appSecret: "synthetic-meta-secret",
    credentials: credentialsOf({ accountId: pageId, platform: "facebook" }, [
      "page-token-1",
    ]),
    platform: "facebook",
    url: server.url,
  });

const facebookComments = `/v27.0/${root}/comments`;

// What a Page lists under its post: its own comment, written now.
const facebookListing = (written: DateTime.Utc, fromId = pageId) =>
  json({
    data: [
      {
        created_time: DateTime.formatIso(written),
        from: { id: fromId },
        id: "102000000000001_7001",
        message: commentText,
      },
    ],
  });

describe("a first comment on a Facebook Page", () => {
  it.live("goes under the post, as the Page, with its text", () =>
    Effect.gen(function* sent() {
      const server = yield* fakeWith((request) =>
        request.method === "POST"
          ? json({ id: "102000000000001_7001" })
          : json({ data: [] })
      );

      const client = yield* facebookOn(server);
      const result = yield* client.publish(yield* commentPart(pageId));

      const [call] = posted(server, facebookComments);
      const params = new URLSearchParams(textOf(call ?? never));

      assert.strictEqual(params.get("message"), commentText);
      assert.isTrue(params.has("appsecret_proof"));
      assert.deepStrictEqual(result, {
        _tag: "published",
        platformPostId: PlatformPostIdSchema.make("102000000000001_7001"),
      });
    }).pipe(Effect.scoped)
  );

  it.live("is found among the post's comments when its answer is lost", () =>
    Effect.gen(function* lost() {
      const now = yield* DateTime.now;

      const server = yield* fakeWith((request) =>
        request.method === "POST" ? dropped : facebookListing(now)
      );

      const client = yield* facebookOn(server);
      const result = yield* client.publish(yield* commentPart(pageId));

      assert.strictEqual(posted(server, facebookComments).length, 1);
      assert.deepStrictEqual(result, {
        _tag: "published",
        platformPostId: PlatformPostIdSchema.make("102000000000001_7001"),
      });
    }).pipe(Effect.scoped)
  );

  it.live("is unconfirmed, never sent again, when nothing settles it", () =>
    Effect.gen(function* unsettled() {
      const now = yield* DateTime.now;

      // Another account's comment with the same words proves nothing.
      const server = yield* fakeWith((request) =>
        request.method === "POST"
          ? dropped
          : facebookListing(now, "synthetic-someone-else")
      );

      const client = yield* facebookOn(server);
      const result = yield* client.publish(yield* commentPart(pageId));

      assert.strictEqual(posted(server, facebookComments).length, 1);
      assert.strictEqual(result._tag, "unconfirmed");
    }).pipe(Effect.scoped)
  );

  it.live("is looked for, never sent, when its run resumes", () =>
    Effect.gen(function* resumed() {
      const now = yield* DateTime.now;
      const server = yield* fakeWith(() => facebookListing(now));
      const client = yield* facebookOn(server);

      const found = yield* client.resume(yield* commentPart(pageId));

      // One written before the attempt began is another's.
      const older = yield* client.resume(
        yield* commentPart(
          pageId,
          DateTime.addDuration(now, Duration.minutes(10))
        )
      );

      assert.deepStrictEqual(posted(server, facebookComments), []);
      assert.strictEqual(found._tag, "published");
      assert.strictEqual(older._tag, "unconfirmed");
    }).pipe(Effect.scoped)
  );

  it.live(
    "fails as refused, never a refused token, on a missing permission",
    () =>
      Effect.gen(function* permission() {
        const server = yield* fakeWith(() =>
          json(
            {
              error: {
                code: 200,
                message: "Permissions error",
                type: "OAuthException",
              },
            },
            403
          )
        );

        const client = yield* facebookOn(server);

        const failure = yield* client
          .publish(yield* commentPart(pageId))
          .pipe(Effect.flip);

        assert.deepStrictEqual(
          failure,
          new BadRequest({ code: "permissionDenied" })
        );
        assert.strictEqual(posted(server, facebookComments).length, 1);
      }).pipe(Effect.scoped)
  );

  it.live("fails as the Page's refusal, which Meta gave before making it", () =>
    Effect.gen(function* refused() {
      const server = yield* fakeWith(() =>
        json(
          { error: { code: 100, message: "Invalid parameter", type: "x" } },
          400
        )
      );

      const client = yield* facebookOn(server);

      const failure = yield* client
        .publish(yield* commentPart(pageId))
        .pipe(Effect.flip);

      assert.strictEqual(failure._tag, "BadRequest");
    }).pipe(Effect.scoped)
  );
});

const instagramUserId = "17841400000000001";

describe("a first comment on Instagram", () => {
  it.live("goes under the media, and is found by its author when lost", () =>
    Effect.gen(function* instagram() {
      const now = yield* DateTime.now;
      let answered = false;

      const server = yield* fakeWith((request) => {
        if (request.method === "POST") {
          if (answered) {
            return dropped;
          }

          answered = true;

          return json({ id: "17900000000000001" });
        }

        return json({
          data: [
            {
              from: { id: instagramUserId },
              id: "17900000000000002",
              text: commentText,
              timestamp: DateTime.formatIso(now),
            },
          ],
        });
      });

      const client: PlatformClient = yield* metaClientWith({
        appSecret: "synthetic-meta-secret",
        credentials: credentialsOf(
          { accountId: instagramUserId, platform: "instagram" },
          ["ig-token-1"]
        ),
        platform: "instagram",
        url: server.url,
      });

      const first = yield* client.publish(yield* commentPart(instagramUserId));
      const lost = yield* client.publish(yield* commentPart(instagramUserId));

      const sent = posted(server, `/v27.0/${root}/comments`);

      assert.strictEqual(
        new URLSearchParams(textOf(sent[0] ?? never)).get("message"),
        commentText
      );
      assert.deepStrictEqual(first, {
        _tag: "published",
        platformPostId: PlatformPostIdSchema.make("17900000000000001"),
      });
      assert.deepStrictEqual(lost, {
        _tag: "published",
        platformPostId: PlatformPostIdSchema.make("17900000000000002"),
      });
      assert.strictEqual(sent.length, 2);
    }).pipe(Effect.scoped)
  );
});

const organization = "urn:li:organization:5000001";

const linkedinOn = (server: PlatformServer, accountId = organization) =>
  linkedinClientWith({
    api: server.url,
    credentials: credentialsOf({ accountId, platform: "linkedin" }, [
      "li-token-1",
    ]),
    version: "202610",
  });

const linkedinComments = `/rest/socialActions/${root}/comments`;

describe("a first comment on a LinkedIn page", () => {
  it.live("goes under the post, as the page", () =>
    Effect.gen(function* page() {
      const server = yield* fakeWith(() =>
        json({ commentUrn: `urn:li:comment:(${root},7002)` }, 201, {
          "x-restli-id": "7002",
        })
      );

      const client = yield* linkedinOn(server);
      const result = yield* client.publish(yield* commentPart(organization));
      const [call] = posted(server, linkedinComments);

      assert.deepStrictEqual(JSON.parse(textOf(call ?? never)), {
        actor: organization,
        message: { text: commentText },
        object: root,
      });
      assert.strictEqual(call?.headers["linkedin-version"], "202610");
      assert.deepStrictEqual(result, {
        _tag: "published",
        platformPostId: PlatformPostIdSchema.make(
          `urn:li:comment:(${root},7002)`
        ),
      });
    }).pipe(Effect.scoped)
  );

  it.live("is found among the post's comments when its answer is lost", () =>
    Effect.gen(function* lost() {
      const now = yield* DateTime.now;

      const server = yield* fakeWith((request) =>
        request.method === "POST"
          ? dropped
          : json({
              elements: [
                {
                  actor: organization,
                  commentUrn: `urn:li:comment:(${root},7003)`,
                  created: { time: DateTime.toEpochMillis(now) },
                  message: { text: commentText },
                },
              ],
              paging: { total: 1 },
            })
      );

      const client = yield* linkedinOn(server);
      const result = yield* client.publish(yield* commentPart(organization));

      assert.strictEqual(posted(server, linkedinComments).length, 1);
      assert.strictEqual(
        result._tag === "published" ? result.platformPostId : "",
        `urn:li:comment:(${root},7003)`
      );
    }).pipe(Effect.scoped)
  );

  it.live(
    "fails as refused, never a refused token, when LinkedIn answers 403",
    () =>
      Effect.gen(function* forbidden() {
        const server = yield* fakeWith(() =>
          json(
            {
              code: "ACCESS_DENIED",
              message: "Not enough permissions",
              status: 403,
            },
            403
          )
        );

        const client = yield* linkedinOn(server);

        const failure = yield* client
          .publish(yield* commentPart(organization))
          .pipe(Effect.flip);

        assert.deepStrictEqual(
          failure,
          new BadRequest({ code: "permissionDenied" })
        );
        // Asked once: no renewal, no second try.
        assert.strictEqual(posted(server, linkedinComments).length, 1);
      }).pipe(Effect.scoped)
  );

  it.live("takes a 401 with LinkedIn's own error for a refused token", () =>
    Effect.gen(function* unauthorized() {
      const server = yield* fakeWith(() =>
        json({ message: "Invalid access token", status: 401 }, 401)
      );

      const client = yield* linkedinOn(server);

      const failure = yield* client
        .publish(yield* commentPart(organization))
        .pipe(Effect.flip);

      assert.strictEqual(failure._tag, "TokenExpired");
    }).pipe(Effect.scoped)
  );

  it.live("waits a minute on LinkedIn's comment throttle, not a day", () =>
    Effect.gen(function* throttled() {
      const server = yield* fakeWith(() =>
        json({ message: "Too many requests", status: 429 }, 429)
      );

      const client = yield* linkedinOn(server);

      const failure = yield* client
        .publish(yield* commentPart(organization))
        .pipe(Effect.flip);

      assert.strictEqual(failure._tag, "RateLimited");
      assert.strictEqual(
        failure._tag === "RateLimited" && failure.retryAfter !== undefined
          ? Duration.toMillis(failure.retryAfter)
          : 0,
        60_000
      );
    }).pipe(Effect.scoped)
  );

  it.live("keeps the comment's URN when LinkedIn gives only its id", () =>
    Effect.gen(function* bareId() {
      const server = yield* fakeWith(() =>
        json({}, 201, { "x-restli-id": "7004" })
      );

      const client = yield* linkedinOn(server);
      const result = yield* client.publish(yield* commentPart(organization));

      assert.strictEqual(
        result._tag === "published" ? result.platformPostId : "",
        `urn:li:comment:(${root},7004)`
      );
    }).pipe(Effect.scoped)
  );

  it.live("is refused on a member's profile, sending nothing", () =>
    Effect.gen(function* profile() {
      const server = yield* fakeWith(() => json({}));
      const client = yield* linkedinOn(server, "urn:li:person:synthetic");

      const failure = yield* client
        .publish(yield* commentPart("urn:li:person:synthetic"))
        .pipe(Effect.flip);

      assert.deepStrictEqual(server.requests(), []);
      assert.strictEqual(
        failure._tag === "BadRequest" ? failure.code : "",
        "partsNotSupported"
      );
    }).pipe(Effect.scoped)
  );
});

const channelOnYouTube = "UC-synthetic-channel";

const youtubeOn = (server: PlatformServer) =>
  youtubeClientWith({
    api: server.url,
    credentials: credentialsOf(
      { accountId: channelOnYouTube, platform: "youtube" },
      ["yt-token-1"]
    ),
    ledger: emptyLedger(),
  });

describe("a first comment on YouTube", () => {
  it.live("goes under the video, as the channel", () =>
    Effect.gen(function* video() {
      const server = yield* fakeWith(() => json({ id: "UgzSyntheticThread" }));
      const client = yield* youtubeOn(server);

      const result = yield* client.publish(
        yield* commentPart(channelOnYouTube)
      );

      const [call] = posted(server, "/youtube/v3/commentThreads");

      assert.strictEqual(call?.query.get("part"), "snippet");
      assert.deepStrictEqual(JSON.parse(textOf(call ?? never)), {
        snippet: {
          channelId: channelOnYouTube,
          topLevelComment: { snippet: { textOriginal: commentText } },
          videoId: root,
        },
      });
      assert.deepStrictEqual(result, {
        _tag: "published",
        platformPostId: PlatformPostIdSchema.make("UgzSyntheticThread"),
      });
    }).pipe(Effect.scoped)
  );

  it.live("is found by the channel among the video's threads when lost", () =>
    Effect.gen(function* lost() {
      const now = yield* DateTime.now;

      const server = yield* fakeWith((request) =>
        request.method === "POST"
          ? json({ error: { code: 503, errors: [] } }, 503)
          : json({
              items: [
                {
                  id: "UgzFoundThread",
                  snippet: {
                    topLevelComment: {
                      snippet: {
                        authorChannelId: { value: channelOnYouTube },
                        publishedAt: DateTime.formatIso(now),
                        textOriginal: commentText,
                      },
                    },
                  },
                },
              ],
            })
      );

      const client = yield* youtubeOn(server);

      const result = yield* client.publish(
        yield* commentPart(channelOnYouTube)
      );

      assert.strictEqual(
        posted(server, "/youtube/v3/commentThreads").length,
        1
      );
      assert.strictEqual(
        result._tag === "published" ? result.platformPostId : "",
        "UgzFoundThread"
      );
    }).pipe(Effect.scoped)
  );

  it.live("fails as refused, never a refused token, on a 403 permission", () =>
    Effect.gen(function* insufficient() {
      const server = yield* fakeWith(() =>
        json(
          {
            error: {
              code: 403,
              errors: [{ domain: "global", reason: "insufficientPermissions" }],
            },
          },
          403
        )
      );

      const client = yield* youtubeOn(server);

      const failure = yield* client
        .publish(yield* commentPart(channelOnYouTube))
        .pipe(Effect.flip);

      assert.deepStrictEqual(
        failure,
        new BadRequest({ code: "insufficientPermissions" })
      );
    }).pipe(Effect.scoped)
  );

  it.live("fails as YouTube's reason when the video takes no comment", () =>
    Effect.gen(function* disabled() {
      const server = yield* fakeWith(() =>
        json(
          {
            error: {
              code: 403,
              errors: [
                { domain: "youtube.commentThread", reason: "commentsDisabled" },
              ],
            },
          },
          403
        )
      );

      const client = yield* youtubeOn(server);

      const failure = yield* client
        .publish(yield* commentPart(channelOnYouTube))
        .pipe(Effect.flip);

      assert.strictEqual(
        failure._tag === "BadRequest" ? failure.code : failure._tag,
        "commentsDisabled"
      );
    }).pipe(Effect.scoped)
  );
});

// A request a test names that did not come.
const never: PlatformRequest = {
  body: new Uint8Array(),
  headers: {},
  method: "NONE",
  path: "",
  query: new URLSearchParams(),
  search: "",
};
