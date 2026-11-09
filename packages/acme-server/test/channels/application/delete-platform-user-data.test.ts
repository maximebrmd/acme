import { assert, layer } from "@effect/vitest";
import { Api } from "acme-contract";
import type { Redacted } from "effect";
import { Effect, Layer, Option } from "effect";
import { Mac, SecureRandom } from "effect/crypto";
import { HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";

import { DataDeletionHandlers } from "#channels/api/data-deletion.ts";
import { ChannelCredentials } from "#channels/application/channel-credentials.ts";
import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { DataDeletionLinks } from "#channels/application/data-deletion-links.ts";
import { DeletePlatformUserData } from "#channels/application/delete-platform-user-data.ts";
import type { Platform } from "#channels/domain/platform.ts";
import { DrizzleChannelRepository } from "#channels/infrastructure/drizzle-channel-repository.ts";
import { DrizzleDataDeletions } from "#channels/infrastructure/drizzle-data-deletions.ts";
import { ChannelPlatforms } from "#channels/infrastructure/platforms/channel-platform-settings.ts";
import { MetaSignedRequestsLive } from "#channels/infrastructure/platforms/meta/meta-signed-requests.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { metaHosts } from "#shared/infrastructure/platforms/meta-graph.ts";
import {
  metaApp,
  signedRequest,
  threadsApp,
} from "#test/channels/fakes/fake-meta.ts";
import {
  DatabaseTest,
  freshChannel,
  freshWorkspace,
  syntheticCredentials,
} from "#test/channels/support.ts";
import { anonymousSecurityTest } from "#workspace/api/security.ts";

const settings = (apps: { readonly threads: boolean }) =>
  Layer.succeed(
    ChannelPlatforms,
    ChannelPlatforms.of({
      bluesky: Option.none(),
      linkedin: Option.none(),
      meta: Option.some(metaApp),
      metaHosts,
      publicUrl: "https://acme.test",
      threads: apps.threads ? Option.some(threadsApp) : Option.none(),
      x: Option.none(),
    })
  );

const deletionsWith = (apps: { readonly threads: boolean }) =>
  DeletePlatformUserData.layer.pipe(
    Layer.provideMerge(
      Layer.mergeAll(
        MetaSignedRequestsLive,
        DrizzleDataDeletions,
        DrizzleChannelRepository,
        Layer.succeed(
          DataDeletionLinks,
          DataDeletionLinks.of({
            statusUrl: (code) => `https://acme.test/data-deletion/${code}`,
          })
        )
      )
    ),
    Layer.provide(
      Layer.mergeAll(
        settings(apps),
        Mac.layerWebCrypto.pipe(Layer.provide(SecureRandom.layerWebCrypto))
      )
    ),
    Layer.provideMerge(DatabaseTest)
  );

// A user's own id on each app, from the random end of the workspace's id,
// so tests and runs never share one.
const userIdOf = (workspaceId: WorkspaceId) =>
  `1022${workspaceId.replaceAll("-", "").slice(-12)}`;

// A channel whose token a Facebook user granted, or a Threads account.
const seeded = Effect.fn("seeded")(function* seeded(
  workspaceId: WorkspaceId,
  platform: Platform,
  options: { readonly accountId?: string; readonly grantedBy?: string } = {}
) {
  const channel = yield* freshChannel(
    workspaceId,
    options.accountId === undefined
      ? { platform }
      : { accountId: options.accountId, platform }
  );

  const synthetic = syntheticCredentials(channel, { keyId: "test-key" });

  const credentials =
    options.grantedBy === undefined
      ? synthetic
      : new ChannelCredentials({
          accessToken: synthetic.accessToken,
          grantedBy: options.grantedBy,
          refreshToken: synthetic.refreshToken,
        });

  yield* ChannelRepository.use((channels) =>
    channels.insert(channel, credentials)
  );

  return channel;
});

const channelIdsIn = (workspaceId: WorkspaceId) =>
  ChannelRepository.use((channels) => channels.list(workspaceId)).pipe(
    Effect.map((channels) => channels.map(({ id }) => id))
  );

const request = (userId: string, secret: Redacted.Redacted) =>
  signedRequest(
    {
      algorithm: "HMAC-SHA256",
      expires: 1_781_000_000,
      issued_at: 1_780_990_000,
      user_id: userId,
    },
    secret
  );

layer(deletionsWith({ threads: true }))(
  "Meta's data deletion requests",
  (it) => {
    it.effect(
      "delete every channel a Facebook user connected, in every workspace",
      () =>
        Effect.gen(function* deletes() {
          const first = yield* freshWorkspace;
          const second = yield* freshWorkspace;
          const userId = userIdOf(first);

          const page = yield* seeded(first, "facebook", { grantedBy: userId });

          const instagram = yield* seeded(first, "instagram", {
            grantedBy: userId,
          });

          const elsewhere = yield* seeded(second, "facebook", {
            grantedBy: userId,
          });

          // Another user's Page, and an account of another platform.
          const colleague = yield* seeded(first, "facebook", {
            grantedBy: `${userId}9`,
          });

          const mastodon = yield* seeded(first, "mastodon", {
            accountId: userId,
          });

          const receipt = yield* DeletePlatformUserData.use((deletions) =>
            deletions.request("facebook", request(userId, metaApp.appSecret))
          );

          assert.strictEqual(receipt.deletion.app, "facebook");
          assert.strictEqual(receipt.deletion.channelsDeleted, 3);
          assert.match(receipt.deletion.code, /^[\da-f]{32}$/u);
          assert.strictEqual(
            receipt.statusUrl,
            `https://acme.test/data-deletion/${receipt.deletion.code}`
          );
          assert.sameMembers(yield* channelIdsIn(first), [
            colleague.id,
            mastodon.id,
          ]);
          assert.deepStrictEqual(yield* channelIdsIn(second), []);
          assert.notInclude(yield* channelIdsIn(first), page.id);
          assert.notInclude(yield* channelIdsIn(first), instagram.id);
          assert.notInclude(yield* channelIdsIn(second), elsewhere.id);

          const status = yield* DeletePlatformUserData.use((deletions) =>
            deletions.status(receipt.deletion.code)
          );

          assert.deepStrictEqual(status, Option.some(receipt.deletion));
        })
    );

    it.effect("delete a Threads user's own accounts", () =>
      Effect.gen(function* threads() {
        const workspaceId = yield* freshWorkspace;
        const userId = userIdOf(workspaceId);

        yield* seeded(workspaceId, "threads", { accountId: userId });

        const page = yield* seeded(workspaceId, "facebook", {
          grantedBy: userId,
        });

        const receipt = yield* DeletePlatformUserData.use((deletions) =>
          deletions.request("threads", request(userId, threadsApp.appSecret))
        );

        assert.strictEqual(receipt.deletion.channelsDeleted, 1);
        assert.deepStrictEqual(yield* channelIdsIn(workspaceId), [page.id]);
      })
    );

    it.effect("refuse a request not signed with the app's secret", () =>
      Effect.gen(function* refuses() {
        const workspaceId = yield* freshWorkspace;
        const userId = userIdOf(workspaceId);

        const page = yield* seeded(workspaceId, "facebook", {
          grantedBy: userId,
        });

        const forged = [
          // Signed with another app's secret.
          request(userId, threadsApp.appSecret),
          // A payload changed after it was signed.
          `${request(`${userId}1`, metaApp.appSecret).split(".")[0] ?? ""}.${
            request(userId, metaApp.appSecret).split(".")[1] ?? ""
          }`,
          "not-a-signed-request",
          ".",
        ];

        for (const signed of forged) {
          const failure = yield* Effect.flip(
            DeletePlatformUserData.use((deletions) =>
              deletions.request("facebook", signed)
            )
          );

          assert.strictEqual(failure._tag, "InvalidSignedRequest");
        }

        assert.deepStrictEqual(yield* channelIdsIn(workspaceId), [page.id]);
      })
    );

    it.effect("answer the status page through the API, and nothing else", () =>
      Effect.gen(function* api() {
        const workspaceId = yield* freshWorkspace;
        const userId = userIdOf(workspaceId);

        yield* seeded(workspaceId, "instagram", { grantedBy: userId });

        const client = yield* HttpApiTest.groups(Api, ["dataDeletion"]).pipe(
          Effect.provide(
            Layer.mergeAll(
              DataDeletionHandlers,
              anonymousSecurityTest,
              HttpServer.layerServices
            )
          )
        );

        const confirmation = yield* client.dataDeletion.request({
          params: { app: "facebook" },
          payload: { signed_request: request(userId, metaApp.appSecret) },
        });

        assert.strictEqual(
          confirmation.url,
          `https://acme.test/data-deletion/${confirmation.confirmation_code}`
        );

        const status = yield* client.dataDeletion.status({
          params: { code: confirmation.confirmation_code },
        });

        assert.strictEqual(status.status, "completed");
        assert.strictEqual(status.channelsDeleted, 1);
        assert.strictEqual(status.app, "facebook");

        const refused = yield* Effect.flip(
          client.dataDeletion.request({
            params: { app: "facebook" },
            payload: { signed_request: request(userId, threadsApp.appSecret) },
          })
        );

        assert.strictEqual(refused._tag, "SignedRequestRefused");

        for (const code of ["0".repeat(32), "../../etc", "x"]) {
          const missing = yield* Effect.flip(
            client.dataDeletion.status({ params: { code } })
          );

          assert.strictEqual(missing._tag, "DataDeletionNotFound");
        }
      }).pipe(Effect.scoped)
    );
  }
);

layer(deletionsWith({ threads: false }))("a server without Threads", (it) => {
  it.effect("refuses Threads' deletion requests as not configured", () =>
    Effect.gen(function* unconfigured() {
      const failure = yield* Effect.flip(
        DeletePlatformUserData.use((deletions) =>
          deletions.request(
            "threads",
            request("25000000000000009", threadsApp.appSecret)
          )
        )
      );

      assert.strictEqual(failure._tag, "MetaAppNotConfigured");
    })
  );
});
