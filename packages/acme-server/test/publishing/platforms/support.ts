import { JoseKey } from "@atproto/oauth-client-node";
import {
  Context,
  DateTime,
  Duration,
  Effect,
  Layer,
  Option,
  Redacted,
  Ref,
  Stream,
} from "effect";
import { Digest, Mac, SecureRandom } from "effect/crypto";
import { FetchHttpClient } from "effect/http";

import { MediaForPublishing } from "#publishing/application/media-for-publishing.ts";
import type { PublishableMedia } from "#publishing/application/media-for-publishing.ts";
import type { OutgoingPost } from "#publishing/application/platform-client.ts";
import { PlatformCredentials } from "#publishing/application/platform-credentials.ts";
import type { CredentialFailure } from "#publishing/application/platform-credentials.ts";
import type { StepTiming } from "#publishing/application/publication-steps.ts";
import { MediaAttachment } from "#publishing/domain/media-attachment.ts";
import { blueskyClient } from "#publishing/infrastructure/platforms/bluesky/bluesky-client.ts";
import { linkedinClient } from "#publishing/infrastructure/platforms/linkedin/linkedin-client.ts";
import { mastodonClient } from "#publishing/infrastructure/platforms/mastodon/mastodon-client.ts";
import { facebookClient } from "#publishing/infrastructure/platforms/meta/facebook-client.ts";
import { instagramClient } from "#publishing/infrastructure/platforms/meta/instagram-client.ts";
import { threadsClient } from "#publishing/infrastructure/platforms/meta/threads-client.ts";
import { xClient } from "#publishing/infrastructure/platforms/x/x-client.ts";
import {
  ChannelIdSchema,
  MediaAssetIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import type { ChannelId, MediaAssetId } from "#shared/domain/ids.ts";
import { MediaRejected } from "#shared/domain/media-rejected.ts";
import type { Platform } from "#shared/domain/platform.ts";
import { TokenExpired } from "#shared/domain/token-expired.ts";
import { isTokenRejected } from "#shared/domain/token-rejected.ts";
import type { TokenRejected } from "#shared/domain/token-rejected.ts";
import type { MetaHosts } from "#shared/infrastructure/platforms/meta-graph.ts";
import { publicHttpClient } from "#shared/infrastructure/platforms/public-http.ts";
import { OpenOutboundGuard } from "#test/channels/support.ts";

// The platform adapters against fake platforms on loopback, with stand-ins
// for the channels context's credentials and the media context's files.

/** Confirmations and polls without waiting, so tests run at once. */
export const testTiming: StepTiming = {
  confirmDelays: [Duration.zero, Duration.zero, Duration.zero],
  longestPoll: Duration.zero,
  processingLimit: Duration.minutes(1),
};

export const channelId = ChannelIdSchema.make(
  "01900000-0000-7000-8000-0000000000c1"
);

export const workspaceId = WorkspaceIdSchema.make(
  "3f1d2c4b-5a69-4788-9a0b-1c2d3e4f5a6b"
);

/** How the stand-in credentials went. */
export class CredentialLog extends Context.Service<
  CredentialLog,
  {
    /** The tokens handed to calls, in order. */
    readonly handed: Effect.Effect<readonly string[]>;
    /** How many times a refused token was renewed. */
    readonly renewals: Effect.Effect<number>;
  }
>()("acme-server/test/publishing/CredentialLog") {}

/**
 * PlatformCredentials as the channels context behaves: the first of
 * `tokens` until a call refuses it, then the next, once; a renewed token
 * refused again, or no token left to renew to, is TokenExpired.
 */
export const credentialsOf = (
  account: { readonly accountId: string; readonly platform: Platform },
  tokens: readonly string[]
) =>
  Layer.effectContext(
    Effect.gen(function* building() {
      const current = yield* Ref.make(0);
      const handed = yield* Ref.make<readonly string[]>([]);
      const renewals = yield* Ref.make(0);

      const tokenAt = (index: number) =>
        Option.fromUndefinedOr(tokens[index]).pipe(
          Option.match({
            onNone: () => Effect.fail(new TokenExpired()),
            onSome: (token) =>
              Ref.update(handed, (before) => [...before, token]).pipe(
                Effect.as({ ...account, accessToken: Redacted.make(token) })
              ),
          })
        );

      const withToken = <A, E, R>(
        _channel: ChannelId,
        use: (
          token: Effect.Success<ReturnType<typeof tokenAt>>
        ) => Effect.Effect<A, E | TokenRejected, R>
      ): Effect.Effect<A, CredentialFailure | Exclude<E, TokenRejected>, R> =>
        Ref.get(current).pipe(
          Effect.flatMap(tokenAt),
          Effect.flatMap((token) =>
            use(token).pipe(
              Effect.catchIf(isTokenRejected, () =>
                Ref.updateAndGet(current, (index) => index + 1).pipe(
                  Effect.tap(() => Ref.update(renewals, (count) => count + 1)),
                  Effect.flatMap(tokenAt),
                  Effect.flatMap((renewed) =>
                    use(renewed).pipe(
                      Effect.catchIf(isTokenRejected, () =>
                        Effect.fail(new TokenExpired())
                      )
                    )
                  )
                )
              )
            )
          )
        );

      return Context.make(
        PlatformCredentials,
        PlatformCredentials.of({
          account: () => Effect.succeed(account),
          withToken,
        })
      ).pipe(
        Context.add(
          CredentialLog,
          CredentialLog.of({
            handed: Ref.get(handed),
            renewals: Ref.get(renewals),
          })
        )
      );
    })
  );

/** A file of a post, held in memory. */
export interface TestFile {
  readonly bytes: Uint8Array;
  readonly media: PublishableMedia;
}

let nextMedia = 0;

/** A synthetic file of `size` bytes. */
export const testFile = (
  kind: "image" | "video",
  size: number,
  contentType = kind === "image" ? "image/png" : "video/mp4"
): TestFile => {
  nextMedia += 1;

  const mediaId = MediaAssetIdSchema.make(
    `01900000-0000-7000-8000-${String(nextMedia).padStart(12, "0")}`
  );

  return {
    bytes: Uint8Array.from({ length: size }, (_, index) => index % 251),
    media: {
      byteSize: size,
      contentType,
      dimensions: Option.some({ height: 600, width: 800 }),
      duration:
        kind === "video" ? Option.some(Duration.seconds(4)) : Option.none(),
      fileName: `${mediaId}.${kind === "image" ? "png" : "mp4"}`,
      kind,
      mediaId,
    },
  };
};

/** MediaForPublishing over the files given. */
export const mediaOf = (files: readonly TestFile[]) => {
  const byId = new Map<MediaAssetId, TestFile>(
    files.map((file) => [file.media.mediaId, file])
  );

  const found = (
    mediaId: MediaAssetId
  ): Effect.Effect<TestFile, MediaRejected> =>
    Option.fromUndefinedOr(byId.get(mediaId)).pipe(
      Option.match({
        onNone: () =>
          Effect.fail(new MediaRejected({ code: "mediaUnavailable" })),
        onSome: Effect.succeed,
      })
    );

  return Layer.succeed(
    MediaForPublishing,
    MediaForPublishing.of({
      describe: (_workspace, mediaId) =>
        found(mediaId).pipe(Effect.map(({ media }) => media)),
      open: (_workspace, mediaId) =>
        Stream.unwrap(
          found(mediaId).pipe(Effect.map(({ bytes }) => Stream.make(bytes)))
        ),
      publicUrl: (_workspace, mediaId) =>
        found(mediaId).pipe(Effect.as(`https://media.test/${mediaId}`)),
    })
  );
};

/** The attachment of a file to a post. */
export const attached = (file: TestFile, altText = "A synthetic picture") =>
  new MediaAttachment({ altText, mediaId: file.media.mediaId });

/** A post as it goes out, started now unless said otherwise. */
export const outgoing = Effect.fn("test.outgoing")(function* outgoing(
  fields: Partial<OutgoingPost> & { readonly accountId: string }
) {
  const post: OutgoingPost = {
    channelId,
    idempotencyKey: "9f86d081884c7d659a2feaa0c55ad015",
    media: [],
    startedAt: yield* DateTime.now,
    text: "Hello from a synthetic account",
    workspaceId,
    ...fields,
  };

  return post;
});

const HttpTest = Layer.mergeAll(FetchHttpClient.layer, OpenOutboundGuard);

const httpClient = publicHttpClient.pipe(Effect.provide(HttpTest));

/** The Mastodon client, over plain HTTP, with the credentials and files. */
export const mastodonClientWith = Effect.fn("test.mastodonClient")(
  function* mastodonClientWith(options: {
    readonly credentials: Layer.Layer<CredentialLog | PlatformCredentials>;
    readonly files?: readonly TestFile[];
  }) {
    const api = yield* httpClient;

    return yield* mastodonClient({
      api,
      scheme: "http:",
      timing: testTiming,
      uploads: api,
    }).pipe(
      Effect.provide(
        Layer.mergeAll(options.credentials, mediaOf(options.files ?? []))
      )
    );
  }
);

/** The LinkedIn client, with the fake as API, in the version it serves. */
export const linkedinClientWith = Effect.fn("test.linkedinClient")(
  function* linkedinClientWith(options: {
    readonly api: string;
    readonly credentials: Layer.Layer<CredentialLog | PlatformCredentials>;
    readonly files?: readonly TestFile[];
    readonly version: string;
  }) {
    const api = yield* httpClient;

    return yield* linkedinClient({
      api,
      apiUrl: new URL(options.api),
      timing: testTiming,
      uploads: api,
      version: options.version,
    }).pipe(
      Effect.provide(
        Layer.mergeAll(options.credentials, mediaOf(options.files ?? []))
      )
    );
  }
);

/** The X client, with the fake as API. */
export const xClientWith = Effect.fn("test.xClient")(
  function* xClientWith(options: {
    readonly api: string;
    readonly credentials: Layer.Layer<CredentialLog | PlatformCredentials>;
    readonly files?: readonly TestFile[];
  }) {
    const api = yield* httpClient;

    return yield* xClient({
      api,
      apiUrl: new URL(options.api),
      timing: testTiming,
      uploads: api,
    }).pipe(
      Effect.provide(
        Layer.mergeAll(options.credentials, mediaOf(options.files ?? []))
      )
    );
  }
);

/** The Bluesky client, with the fake as PDS and video service. */
export const blueskyClientWith = Effect.fn("test.blueskyClient")(
  function* blueskyClientWith(options: {
    readonly credentials: Layer.Layer<CredentialLog | PlatformCredentials>;
    readonly files?: readonly TestFile[];
    readonly videoService: string;
  }) {
    const api = yield* httpClient;

    return yield* blueskyClient({
      api,
      timing: testTiming,
      uploads: api,
      videoService: new URL(options.videoService),
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          options.credentials,
          mediaOf(options.files ?? []),
          SecureRandom.layerWebCrypto,
          Digest.layerWebCrypto
        )
      )
    );
  }
);

/**
 * A saved OAuth session as the channels context stores Bluesky's
 * credential: a DPoP key made for the run, an access token the fake PDS
 * takes, and an expiry.
 */
export const blueskySession = Effect.fn("test.blueskySession")(
  function* blueskySession(options: {
    readonly accessToken: string;
    readonly did: string;
    readonly expiresAt: DateTime.Utc;
    readonly pds: string;
  }) {
    const key = yield* Effect.promise(
      async () => await JoseKey.generate(["ES256"])
    );

    return JSON.stringify({
      authMethod: { method: "none" },
      dpopJwk: key.privateJwk,
      tokenSet: {
        access_token: options.accessToken,
        aud: options.pds,
        expires_at: DateTime.formatIso(options.expiresAt),
        iss: options.pds,
        refresh_token: "refresh-synthetic",
        scope: "atproto transition:generic",
        sub: options.did,
        token_type: "DPoP",
      },
    });
  }
);

/** Every Meta service at the fake's address. */
export const metaHostsAt = (url: string): MetaHosts => ({
  facebookDialog: new URL(url),
  facebookGraph: new URL(url),
  threadsAuthorize: new URL(url),
  threadsGraph: new URL(url),
});

const MetaCryptoTest = Mac.layerWebCrypto.pipe(
  Layer.provide(SecureRandom.layerWebCrypto)
);

/** Which Meta client to build against the fake Graph. */
export type MetaPlatform = "facebook" | "instagram" | "threads";

/**
 * A Meta client against the fake at `url`, with the credentials and files.
 * Facebook and Instagram sign their calls with `appSecret`.
 */
export const metaClientWith = Effect.fn("test.metaClient")(
  function* metaClientWith(options: {
    readonly appSecret: string;
    readonly credentials: Layer.Layer<CredentialLog | PlatformCredentials>;
    readonly files?: readonly TestFile[];
    readonly platform: MetaPlatform;
    readonly url: string;
  }) {
    const api = yield* httpClient;
    const hosts = metaHostsAt(options.url);
    const appSecret = Option.some(Redacted.make(options.appSecret));

    const services = Layer.mergeAll(
      options.credentials,
      mediaOf(options.files ?? []),
      MetaCryptoTest
    );

    if (options.platform === "threads") {
      return yield* threadsClient({ api, hosts, timing: testTiming }).pipe(
        Effect.provide(services)
      );
    }

    if (options.platform === "instagram") {
      return yield* instagramClient({
        api,
        appSecret,
        hosts,
        timing: testTiming,
      }).pipe(Effect.provide(services));
    }

    return yield* facebookClient({
      api,
      appSecret,
      hosts,
      timing: testTiming,
      uploads: api,
    }).pipe(Effect.provide(services));
  }
);
