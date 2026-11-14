// The text a channel receives when its post asks for short links: the
// routed publisher on Postgres, with the shortlinks context's links, and
// clients that keep what they are handed.
import { assert, layer } from "@effect/vitest";
import { ConfigProvider, DateTime, Effect, Layer, Option, Ref } from "effect";

import { LinkShortener } from "#publishing/application/link-shortener.ts";
import { PlatformClients } from "#publishing/application/platform-client.ts";
import type { OutgoingPost } from "#publishing/application/platform-client.ts";
import { PlatformPublisher } from "#publishing/application/platform-publisher.ts";
import type { PublishRequest } from "#publishing/application/platform-publisher.ts";
import { PostAllowance } from "#publishing/application/post-allowance.ts";
import { PostMeter } from "#publishing/application/post-meter.ts";
import { PostRepository } from "#publishing/application/post-repository.ts";
import { RoutedPlatformPublisher } from "#publishing/application/routed-platform-publisher.ts";
import { CurrentThreadedPlatforms } from "#publishing/application/threaded-platforms.ts";
import { PostContent } from "#publishing/domain/post-content.ts";
import { PostPart } from "#publishing/domain/post-part.ts";
import { PostTargetIdSchema } from "#publishing/domain/post-target-id.ts";
import { PostTarget } from "#publishing/domain/post-target.ts";
import { createDraft, withLinksShortened } from "#publishing/domain/post.ts";
import { DrizzlePostRepository } from "#publishing/infrastructure/drizzle-post-repository.ts";
import { ShortLinksLinkShortener } from "#publishing/infrastructure/shortlinks-link-shortener.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { newId } from "#shared/application/ids.ts";
import { ChannelIdSchema, PostIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import { ShortLinksLive } from "#shortlinks/container.ts";
import { DatabaseTest, freshWorkspace } from "#test/channels/support.ts";
import { credentialsOf } from "#test/publishing/platforms/support.ts";
import { OpenLinkStanding } from "#test/shortlinks/support.ts";

const base = "https://go.example.com/";

const landing = "https://example.com/a/landing/page/longer/than/a/short/link";

// What the clients were handed, by publish and by resume.
const handed = Ref.makeUnsafe<readonly OutgoingPost[]>([]);

const RecordingClients = Layer.succeed(
  PlatformClients,
  PlatformClients.of({
    for: (platform) =>
      Option.some({
        platform,
        publish: (post) =>
          Ref.update(handed, (posts) => [...posts, post]).pipe(
            Effect.as({
              _tag: "published" as const,
              platformPostId: PlatformPostIdSchema.make("synthetic-1"),
            })
          ),
        resume: (post) =>
          Ref.update(handed, (posts) => [...posts, post]).pipe(
            Effect.as({ _tag: "unconfirmed" as const, reason: "interrupted" })
          ),
      }),
  })
);

const NoLimits = Layer.succeed(
  PostAllowance,
  PostAllowance.of({
    channels: () => Effect.succeed({ allowed: Option.none(), connected: 1 }),
    members: () => Effect.succeed({ allowed: Option.none(), taken: 1 }),
    scheduledPerMonth: () => Effect.succeed(Option.none()),
  })
);

const withBase = ConfigProvider.layerAdd(
  ConfigProvider.fromUnknown({ PEAL_SHORT_LINK_BASE: base }),
  { asPrimary: true }
);

// The publisher for a channel on `platform`, with the links `shortener`
// gives.
const publisherWith = <E, R>(
  platform: "mastodon" | "pinterest",
  shortener: Layer.Layer<LinkShortener, E, R>
) =>
  RoutedPlatformPublisher.pipe(
    Layer.provide(
      Layer.mergeAll(
        NoLimits,
        PostMeter.unmetered,
        RecordingClients,
        credentialsOf({ accountId: `synthetic@${platform}.test`, platform }, [
          "token-1",
        ]),
        Layer.succeed(CurrentThreadedPlatforms, { takesParts: () => true }),
        shortener
      )
    ),
    Layer.provideMerge(DrizzlePostRepository),
    Layer.provideMerge(DatabaseTest)
  );

const Shortening = publisherWith(
  "mastodon",
  ShortLinksLinkShortener.pipe(
    Layer.provide(
      ShortLinksLive.pipe(
        Layer.provide(OpenLinkStanding),
        Layer.provide(withBase)
      )
    ),
    Layer.provide(DatabaseTest)
  )
);

const part = (text: string) =>
  new PostPart({ delaySeconds: 0, media: [], overrides: [], text });

const startedAt = DateTime.makeUnsafe("2026-06-15T08:00:00Z");

// A post of `content` on `channels`, asking for short links or not, with
// each target's first part already live (so its second can answer it).
const postOn = Effect.fn("postOn")(function* postOn(
  content: PostContent,
  channels: readonly ChannelId[],
  shorten: boolean
) {
  const posts = yield* PostRepository;
  const postId = yield* newId(PostIdSchema);

  const targets = yield* Effect.all(
    channels.map((channelId) =>
      newId(PostTargetIdSchema).pipe(
        Effect.map(
          (targetId) =>
            new PostTarget({
              channelId,
              id: targetId,
              liveParts: [
                {
                  index: 0,
                  permalink: Option.none(),
                  platformPostId: Option.some(
                    PlatformPostIdSchema.make("root-1")
                  ),
                  publishedAt: startedAt,
                  round: 1,
                },
              ],
              options: Option.none(),
              postId,
              round: 1,
              status: { _tag: "publishing", cancelRequested: false, startedAt },
            })
        )
      )
    )
  );

  const draft = createDraft(
    postId,
    yield* freshWorkspace,
    content,
    Option.none()
  );

  yield* posts.insert(withLinksShortened(draft, shorten), targets);

  return { postId, targets };
});

// What the channel of `target` is handed for `part`, published or resumed.
const sent = Effect.fn("sent")(function* sent(
  postId: typeof PostIdSchema.Type,
  target: PostTarget,
  index: number,
  how: "publish" | "resume"
) {
  yield* Ref.set(handed, []);

  const request: PublishRequest = {
    channelId: target.channelId,
    idempotencyKey: `${target.id}:1:publish/${String(index)}`,
    part: index,
    postId,
    startedAt,
    targetId: target.id,
  };

  yield* PlatformPublisher.use((publisher) =>
    how === "publish" ? publisher.publish(request) : publisher.resume(request)
  );

  const [post] = yield* Ref.get(handed);

  return post?.text ?? "";
});

const shortIn = (text: string) =>
  text.match(/https:\/\/go\.example\.com\/[0-9A-Za-z]{7}/gu) ?? [];

layer(Shortening)("a post that asks for short links", (it) => {
  it.effect(
    "goes out with short addresses, one per channel, the same on a resume",
    () =>
      Effect.gen(function* shortened() {
        const one = yield* newId(ChannelIdSchema);
        const two = yield* newId(ChannelIdSchema);

        const { postId, targets } = yield* postOn(
          new PostContent({
            media: [],
            overrides: [],
            text: `New: ${landing} 🎉 again ${landing}`,
          }),
          [one, two],
          true
        );

        const [first, second] = targets;

        assert(first !== undefined && second !== undefined);

        const onOne = yield* sent(postId, first, 0, "publish");
        const onTwo = yield* sent(postId, second, 0, "publish");
        const resumed = yield* sent(postId, first, 0, "resume");

        const [code, again] = shortIn(onOne);

        assert.strictEqual(onOne, `New: ${code} 🎉 again ${code}`);
        assert.strictEqual(again, code);
        assert.notStrictEqual(shortIn(onTwo)[0], code);
        assert.strictEqual(resumed, onOne);
        // The text kept is the text written.
        const stored = yield* PostRepository.use((posts) => posts.find(postId));

        assert.strictEqual(
          Option.getOrThrow(stored).post.content.text,
          `New: ${landing} 🎉 again ${landing}`
        );
      })
  );

  it.effect("gives each part of a thread links of its own", () =>
    Effect.gen(function* threaded() {
      const { postId, targets } = yield* postOn(
        new PostContent({
          followUps: [part(`More at ${landing}`)],
          media: [],
          overrides: [],
          text: `First at ${landing}`,
        }),
        [yield* newId(ChannelIdSchema)],
        true
      );

      const [target] = targets;

      assert(target !== undefined);

      const first = shortIn(yield* sent(postId, target, 0, "publish"));
      const second = shortIn(yield* sent(postId, target, 1, "publish"));

      assert.lengthOf(first, 1);
      assert.lengthOf(second, 1);
      assert.notStrictEqual(first[0], second[0]);
    })
  );

  it.effect("goes out as written without the flag", () =>
    Effect.gen(function* unflagged() {
      const text = `Plain: ${landing}`;

      const { postId, targets } = yield* postOn(
        new PostContent({ media: [], overrides: [], text }),
        [yield* newId(ChannelIdSchema)],
        false
      );

      const [target] = targets;

      assert(target !== undefined);
      assert.strictEqual(yield* sent(postId, target, 0, "publish"), text);
    })
  );
});

layer(publisherWith("mastodon", LinkShortener.none))(
  "a post that asks for short links on a server without them",
  (it) => {
    it.effect("goes out as written", () =>
      Effect.gen(function* noBase() {
        const text = `Plain: ${landing}`;

        const { postId, targets } = yield* postOn(
          new PostContent({ media: [], overrides: [], text }),
          [yield* newId(ChannelIdSchema)],
          true
        );

        const [target] = targets;

        assert(target !== undefined);
        assert.strictEqual(yield* sent(postId, target, 0, "publish"), text);
      })
    );
  }
);

layer(
  publisherWith(
    "pinterest",
    ShortLinksLinkShortener.pipe(
      Layer.provide(
        ShortLinksLive.pipe(
          Layer.provide(OpenLinkStanding),
          Layer.provide(withBase)
        )
      ),
      Layer.provide(DatabaseTest)
    )
  )
)("a post that asks for short links on Pinterest", (it) => {
  it.effect("goes out as written", () =>
    Effect.gen(function* pinterest() {
      const text = `Pin: ${landing}`;

      const { postId, targets } = yield* postOn(
        new PostContent({ media: [], overrides: [], text }),
        [yield* newId(ChannelIdSchema)],
        true
      );

      const [target] = targets;

      assert(target !== undefined);
      assert.strictEqual(yield* sent(postId, target, 0, "publish"), text);
    })
  );
});

layer(
  publisherWith(
    "mastodon",
    Layer.succeed(
      LinkShortener,
      LinkShortener.of({
        addresses: Option.some({ base, codeLength: 7 }),
        shortened: () => Effect.fail(new DatabaseError({ cause: "synthetic" })),
      })
    )
  )
)("a post whose short links cannot be kept", (it) => {
  it.effect("fails as unavailable, sending nothing", () =>
    Effect.gen(function* unavailable() {
      const { postId, targets } = yield* postOn(
        new PostContent({ media: [], overrides: [], text: `Down: ${landing}` }),
        [yield* newId(ChannelIdSchema)],
        true
      );

      const [target] = targets;

      assert(target !== undefined);
      yield* Ref.set(handed, []);

      const failure = yield* PlatformPublisher.use((publisher) =>
        publisher.publish({
          channelId: target.channelId,
          idempotencyKey: `${target.id}:1:publish/0`,
          part: 0,
          postId,
          startedAt,
          targetId: target.id,
        })
      ).pipe(Effect.flip);

      assert.strictEqual(failure._tag, "PlatformUnavailable");
      assert.lengthOf(yield* Ref.get(handed), 0);
    })
  );
});
