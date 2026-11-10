import { assert, describe, it } from "@effect/vitest";
import { Duration, Effect, Layer, Option, Redacted, Stream } from "effect";

import { ChannelAccess } from "#channels/application/channel-access.ts";
import type {
  AccessFailure,
  ChannelAccount,
  ChannelToken,
} from "#channels/application/channel-access.ts";
import { ChannelUnusable } from "#channels/application/channel-unusable.ts";
import { MediaForPlatforms } from "#media/application/media-for-platforms.ts";
import { MediaNotPublishable } from "#media/application/media-not-publishable.ts";
import { MediaStorageFailed } from "#media/application/media-storage-failed.ts";
import { MediaForPublishing } from "#publishing/application/media-for-publishing.ts";
import { PlatformCredentials } from "#publishing/application/platform-credentials.ts";
import { ChannelAccessCredentials } from "#publishing/infrastructure/channel-access-credentials.ts";
import { LibraryMediaForPublishing } from "#publishing/infrastructure/library-media-for-publishing.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import {
  ChannelIdSchema,
  MediaAssetIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import { MediaRejected } from "#shared/domain/media-rejected.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { TokenExpired } from "#shared/domain/token-expired.ts";
import { isTokenRejected } from "#shared/domain/token-rejected.ts";
import type { TokenRejected } from "#shared/domain/token-rejected.ts";

// The adapters through which publishing reaches the channels and media
// contexts: what each context's refusal becomes for the publishing policy.

const channelId = ChannelIdSchema.make("01900000-0000-7000-8000-0000000000e1");

const workspaceId = WorkspaceIdSchema.make(
  "8b2c3d4e-5f60-4718-9a2b-3c4d5e6f7a8b"
);

const assetId = MediaAssetIdSchema.make("01900000-0000-7000-8000-0000000000e2");

// ChannelAccess refusing every channel with `failure`.
const refusingAccess = (failure: AccessFailure) =>
  ChannelAccessCredentials.pipe(
    Layer.provide(
      Layer.succeed(
        ChannelAccess,
        ChannelAccess.of({
          account: () =>
            failure._tag === "PlatformUnavailable"
              ? Effect.die("Reading an account never calls the platform")
              : Effect.fail(failure),
          withToken: () => Effect.fail(failure),
          workspaceOf: () => Effect.succeed(Option.none()),
        })
      )
    )
  );

const account: ChannelAccount = {
  accountId: "synthetic@mastodon.test",
  channelId,
  connection: Option.none(),
  platform: "mastodon",
  scopes: ["profile", "write:statuses", "write:media"],
};

// Hands out one token; a refused one needs reconnecting.
const withOneToken = <A, E, R>(
  _channel: ChannelId,
  use: (token: ChannelToken) => Effect.Effect<A, E | TokenRejected, R>
): Effect.Effect<A, AccessFailure | Exclude<E, TokenRejected>, R> =>
  Effect.succeed({ ...account, accessToken: Redacted.make("token-1") }).pipe(
    Effect.flatMap((token) =>
      use(token).pipe(
        Effect.catchIf(isTokenRejected, () => Effect.fail(new TokenExpired()))
      )
    )
  );

// ChannelAccess handing out a token for the channel.
const grantingAccess = ChannelAccessCredentials.pipe(
  Layer.provide(
    Layer.succeed(
      ChannelAccess,
      ChannelAccess.of({
        account: () => Effect.succeed(account),
        withToken: withOneToken,
        workspaceOf: () => Effect.succeed(Option.none()),
      })
    )
  )
);

const refusalOf = (failure: AccessFailure) =>
  PlatformCredentials.use((credentials) =>
    Effect.all([
      credentials.withToken(channelId, () => Effect.void).pipe(Effect.flip),
      failure._tag === "PlatformUnavailable"
        ? Effect.succeed(Option.none())
        : credentials.account(channelId).pipe(Effect.flip, Effect.asSome),
    ])
  ).pipe(Effect.provide(refusingAccess(failure)));

// MediaForPlatforms refusing every asset with `failure`.
const refusingMedia = (failure: MediaNotPublishable | MediaStorageFailed) =>
  LibraryMediaForPublishing.pipe(
    Layer.provide(
      Layer.succeed(
        MediaForPlatforms,
        MediaForPlatforms.of({
          describe: () =>
            failure._tag === "MediaNotPublishable"
              ? Effect.fail(failure)
              : Effect.die("Describing reads no file"),
          publicUrl: () => Effect.fail(failure),
          read: () => Stream.fail(failure),
        })
      )
    )
  );

describe("the channels context, as publishing sees it", () => {
  it.effect("refuses a disconnected or turned-off channel's post", () =>
    Effect.gen(function* unusable() {
      const disconnected = new BadRequest({ code: "channelDisconnected" });
      const disabled = new BadRequest({ code: "channelDisabled" });

      assert.deepStrictEqual(
        yield* refusalOf(
          new ChannelUnusable({ channelId, reason: "notFound" })
        ),
        [disconnected, Option.some(disconnected)]
      );
      assert.deepStrictEqual(
        yield* refusalOf(
          new ChannelUnusable({ channelId, reason: "disabled" })
        ),
        [disabled, Option.some(disabled)]
      );
    })
  );

  it.effect(
    "tries again later when the token could not be read or renewed",
    () =>
      Effect.gen(function* later() {
        assert.deepStrictEqual(
          yield* refusalOf(new DatabaseError({ cause: "synthetic" })),
          [new PlatformUnavailable(), Option.some(new PlatformUnavailable())]
        );
        assert.deepStrictEqual(yield* refusalOf(new PlatformUnavailable()), [
          new PlatformUnavailable(),
          Option.none(),
        ]);
      })
  );

  it.effect("asks for a reconnect when the token is gone", () =>
    Effect.gen(function* reconnect() {
      assert.deepStrictEqual(yield* refusalOf(new TokenExpired()), [
        new TokenExpired(),
        Option.some(new TokenExpired()),
      ]);
    })
  );

  it.effect("hands the call its token, and passes its own failures on", () =>
    Effect.gen(function* granted() {
      const credentials = yield* PlatformCredentials;

      const token = yield* credentials.withToken(channelId, ({ accessToken }) =>
        Effect.succeed(Redacted.value(accessToken))
      );

      const own = yield* credentials
        .withToken(channelId, () =>
          Effect.fail(new MediaRejected({ code: "tooLarge" }))
        )
        .pipe(Effect.flip);

      assert.strictEqual(token, "token-1");
      assert.deepStrictEqual(own, new MediaRejected({ code: "tooLarge" }));
      assert.deepStrictEqual(yield* credentials.account(channelId), {
        accountId: "synthetic@mastodon.test",
        connection: Option.none(),
        platform: "mastodon",
      });
    }).pipe(Effect.provide(grantingAccess))
  );
});

describe("the media context, as publishing sees it", () => {
  it.effect("refuses media that is gone or not ready", () =>
    Effect.gen(function* unpublishable() {
      const media = yield* MediaForPublishing;
      const unavailable = new MediaRejected({ code: "mediaUnavailable" });

      assert.deepStrictEqual(
        yield* media.describe(workspaceId, assetId).pipe(Effect.flip),
        unavailable
      );
      assert.deepStrictEqual(
        yield* Stream.runDrain(media.open(workspaceId, assetId)).pipe(
          Effect.flip
        ),
        unavailable
      );
    }).pipe(
      Effect.provide(
        refusingMedia(new MediaNotPublishable({ assetId, reason: "notReady" }))
      )
    )
  );

  it.effect("tries again later when the store does not answer", () =>
    Effect.gen(function* storeDown() {
      const media = yield* MediaForPublishing;

      assert.deepStrictEqual(
        yield* Stream.runDrain(media.open(workspaceId, assetId)).pipe(
          Effect.flip
        ),
        new PlatformUnavailable()
      );
      assert.deepStrictEqual(
        yield* media
          .publicUrl(workspaceId, assetId, Duration.minutes(5))
          .pipe(Effect.flip),
        new PlatformUnavailable()
      );
    }).pipe(
      Effect.provide(
        refusingMedia(
          new MediaStorageFailed({ cause: "synthetic", operation: "read" })
        )
      )
    )
  );
});
