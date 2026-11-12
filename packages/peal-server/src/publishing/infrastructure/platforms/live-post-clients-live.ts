import { Effect, Layer, Option } from "effect";
import { Digest, SecureRandom } from "effect/crypto";
import { FetchHttpClient } from "effect/http";

import { LivePostClients } from "#publishing/application/live-post-clients.ts";
import { LivePostEdits } from "#publishing/application/live-post-edits.ts";
import { PlatformCredentials } from "#publishing/application/platform-credentials.ts";
import {
  editBlocker,
  unpublishBlocker,
} from "#publishing/domain/live-post-support.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import type { Platform } from "#shared/domain/platform.ts";
import { OutboundGuard } from "#shared/infrastructure/platforms/outbound-guard.ts";
import { pinterestHostsConfig } from "#shared/infrastructure/platforms/pinterest-api.ts";
import { publicHttpClient } from "#shared/infrastructure/platforms/public-http.ts";

import { blueskyLivePost } from "./bluesky/bluesky-live-post.ts";
import {
  googleBusinessLiveEdit,
  googleBusinessLivePost,
} from "./google-business/google-business-live-post.ts";
import type { LivePostEditor } from "./live-post-editor.ts";
import type { LivePostRemover } from "./live-post-remover.ts";
import {
  mastodonLiveEdit,
  mastodonLivePost,
} from "./mastodon/mastodon-live-post.ts";
import { pinterestLivePost } from "./pinterest/pinterest-live-post.ts";
import { xLivePost } from "./x/x-live-post.ts";

/** Where the platforms that delete or edit posts are. */
export interface LivePostSettings {
  readonly googleBusinessApi: URL;
  /** `https:`; `http:` only for tests against local fakes. */
  readonly mastodonScheme: "http:" | "https:";
  readonly pinterestApi: URL;
  readonly xApi: URL;
}

/** A platform where Peal deletes no post. */
export const notDeleting = "notDeleting";

/** A platform where Peal edits no post. */
export const notEditing = "notEditing";

/** What Peal does to posts live on one platform. */
export interface LivePostAdapters {
  /** The editor that replaces their text, or `notEditing`. */
  readonly edit: LivePostEditor | typeof notEditing;
  /** The remover that deletes them, or `notDeleting`. */
  readonly remove: LivePostRemover | typeof notDeleting;
}

/**
 * One entry per platform, or the registry does not compile: its adapters,
 * each a "not doing it" marker where the platform has no call or Peal
 * lacks the permission (`#publishing/domain/live-post-support.ts`, which a
 * test keeps equal to this registry).
 */
type Registry = {
  readonly [P in Platform]: LivePostAdapters;
};

const neither: LivePostAdapters = { edit: notEditing, remove: notDeleting };

/** The code a change Peal does not make on the platform is refused with. */
export const notSupportedCode = "notSupported";

/**
 * The registry of removers and editors, from the public HTTP client (the outbound
 * guard, 20 seconds at most). Needs PlatformCredentials, SecureRandom and
 * Digest (Bluesky's proofs).
 */
export const livePostRegistryWith = Effect.fn("LivePostClients.registry")(
  function* livePostRegistryWith(settings: LivePostSettings) {
    const api = yield* publicHttpClient;

    const google = { api, apiUrl: settings.googleBusinessApi };
    const mastodon = { api, scheme: settings.mastodonScheme };

    const registry: Registry = {
      bluesky: { edit: notEditing, remove: yield* blueskyLivePost({ api }) },
      facebook: neither,
      googleBusiness: {
        edit: googleBusinessLiveEdit(google),
        remove: googleBusinessLivePost(google),
      },
      instagram: neither,
      linkedin: neither,
      mastodon: {
        edit: mastodonLiveEdit(mastodon),
        remove: mastodonLivePost(mastodon),
      },
      pinterest: {
        edit: notEditing,
        remove: pinterestLivePost({ api, apiUrl: settings.pinterestApi }),
      },
      threads: neither,
      tiktok: neither,
      x: {
        edit: notEditing,
        remove: xLivePost({ api, apiUrl: settings.xApi }),
      },
      youtube: neither,
    };

    return registry;
  }
);

/** The code of an edit whose change ended before its call was made. */
export const editEndedCode = "changeEnded";

/**
 * LivePostClients on the platforms' own APIs, with the channel's token from
 * PlatformCredentials, renewed once when the platform refuses it. Each
 * call runs inside the channel's gate (`RemoveLivePost`, `EditLivePost`),
 * and is refused `notSupported`, with nothing sent, where Peal does not
 * make that change: the blocker of the kind asked, or no adapter. An
 * edit's text and the target's options are read here, from the change
 * (`LivePostEdits`), as the gate's call carries ids only.
 */
export const livePostClientsWith = (settings: LivePostSettings) =>
  Layer.effect(
    LivePostClients,
    Effect.gen(function* LivePostClientsLive() {
      const credentials = yield* PlatformCredentials;
      const edits = yield* LivePostEdits;
      const registry = yield* livePostRegistryWith(settings);

      return LivePostClients.of({
        edit: ({ changeId, channelId, platformPostId }) =>
          Effect.gen(function* edit() {
            const { platform } = yield* credentials.account(channelId);
            const editor = registry[platform].edit;

            if (editor === notEditing || Option.isSome(editBlocker(platform))) {
              return yield* new BadRequest({ code: notSupportedCode });
            }

            const pending = yield* edits.of(changeId).pipe(Effect.orDie);

            if (Option.isNone(pending)) {
              return yield* new BadRequest({ code: editEndedCode });
            }

            const { options, text } = pending.value;

            return yield* credentials.withToken(channelId, (token) =>
              editor(token, { options, platformPostId, text })
            );
          }),
        remove: ({ channelId, platformPostId }) =>
          Effect.gen(function* remove() {
            const { platform } = yield* credentials.account(channelId);
            const remover = registry[platform].remove;

            if (
              remover === notDeleting ||
              Option.isSome(unpublishBlocker(platform))
            ) {
              return yield* new BadRequest({ code: notSupportedCode });
            }

            return yield* credentials.withToken(channelId, (token) =>
              remover(token, platformPostId)
            );
          }),
      });
    })
  );

/**
 * The platforms as production reaches them, Pinterest's on its Sandbox
 * when the server is set to it. Needs PlatformCredentials, LivePostEdits
 * and Dns.
 */
export const LivePostClientsLive = Layer.unwrap(
  pinterestHostsConfig.pipe(
    Effect.map((pinterest) =>
      livePostClientsWith({
        googleBusinessApi: new URL("https://mybusiness.googleapis.com"),
        mastodonScheme: "https:",
        pinterestApi: pinterest.api,
        xApi: new URL("https://api.x.com"),
      })
    )
  )
).pipe(
  Layer.provide(OutboundGuard.layer),
  Layer.provide(
    Layer.mergeAll(FetchHttpClient.layer, Digest.layerWebCrypto).pipe(
      Layer.provideMerge(SecureRandom.layerWebCrypto)
    )
  )
);
