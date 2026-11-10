import { assert, layer } from "@effect/vitest";
import type { Redacted } from "effect";
import { Effect, Layer, Option } from "effect";
import { Mac, SecureRandom } from "effect/crypto";
import { HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";
import { Api } from "peal-contract";

import { DataDeletionHandlers } from "#channels/api/data-deletion.ts";
import { ChannelCredentials } from "#channels/application/channel-credentials.ts";
import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { DataDeletionLinks } from "#channels/application/data-deletion-links.ts";
import { DeauthorizePlatformUser } from "#channels/application/deauthorize-platform-user.ts";
import { DeletePlatformUserData } from "#channels/application/delete-platform-user-data.ts";
import type { Platform } from "#channels/domain/platform.ts";
import { DrizzleChannelRepository } from "#channels/infrastructure/drizzle-channel-repository.ts";
import { DrizzleDataDeletions } from "#channels/infrastructure/drizzle-data-deletions.ts";
import { ChannelPlatforms } from "#channels/infrastructure/platforms/channel-platform-settings.ts";
import { MetaSignedRequestsLive } from "#channels/infrastructure/platforms/meta/meta-signed-requests.ts";
import { SqlChannelLocks } from "#channels/infrastructure/sql-channel-locks.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { InstagramConnection } from "#shared/domain/instagram-connection.ts";
import { metaHosts } from "#shared/infrastructure/platforms/meta-graph.ts";
import { pinterestHosts } from "#shared/infrastructure/platforms/pinterest-api.ts";
import { tiktokHosts } from "#shared/infrastructure/platforms/tiktok-api.ts";
import {
  instagramApp,
  metaApp,
  signedRequest,
  threadsApp,
} from "#test/channels/fakes/fake-meta.ts";
import {
  DatabaseTest,
  freshChannel,
  freshWorkspace,
  RecordedNotices,
  syntheticCredentials,
} from "#test/channels/support.ts";
import { anonymousSecurityTest } from "#workspace/api/security.ts";

const settings = (apps: { readonly threads: boolean }) =>
  Layer.succeed(
    ChannelPlatforms,
    ChannelPlatforms.of({
      bluesky: Option.none(),
      googleBusiness: Option.none(),
      instagram: Option.some(instagramApp),
      linkedin: Option.none(),
      meta: Option.some(metaApp),
      metaHosts,
      pinterest: Option.none(),
      pinterestHosts,
      publicUrl: "https://peal.test",
      threads: apps.threads ? Option.some(threadsApp) : Option.none(),
      tiktok: Option.none(),
      tiktokHosts,
      x: Option.none(),
      youtube: Option.none(),
    })
  );

const deletionsWith = (apps: { readonly threads: boolean }) =>
  Layer.mergeAll(
    DeletePlatformUserData.layer,
    DeauthorizePlatformUser.layer
  ).pipe(
    Layer.provideMerge(
      Layer.mergeAll(
        MetaSignedRequestsLive,
        DrizzleDataDeletions,
        DrizzleChannelRepository,
        SqlChannelLocks,
        RecordedNotices.layer,
        Layer.succeed(
          DataDeletionLinks,
          DataDeletionLinks.of({
            statusUrl: (code) => `https://peal.test/data-deletion/${code}`,
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

// A channel whose token a Facebook user granted, or a Threads account, or
// an Instagram account through the way in given.
const seeded = Effect.fn("seeded")(function* seeded(
  workspaceId: WorkspaceId,
  platform: Platform,
  options: {
    readonly accountId?: string;
    readonly connection?: InstagramConnection;
    readonly grantedBy?: string;
  } = {}
) {
  const channel = yield* freshChannel(workspaceId, {
    accountId: options.accountId,
    connection: options.connection,
    platform,
  });

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

const request = (
  userId: string,
  secret: Redacted.Redacted,
  issuedAt = 1_780_990_000
) =>
  signedRequest(
    {
      algorithm: "HMAC-SHA256",
      expires: issuedAt + 10_000,
      issued_at: issuedAt,
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
            `https://peal.test/data-deletion/${receipt.deletion.code}`
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

    it.effect(
      "answer a request sent again with its receipt, deleting nothing more",
      () =>
        Effect.gen(function* replayed() {
          const workspaceId = yield* freshWorkspace;
          const userId = userIdOf(workspaceId);
          const signed = request(userId, metaApp.appSecret);

          yield* seeded(workspaceId, "facebook", { grantedBy: userId });

          const first = yield* DeletePlatformUserData.use((deletions) =>
            deletions.request("facebook", signed)
          );

          assert.strictEqual(first.deletion.channelsDeleted, 1);

          // The user connects a Page again, after asking.
          const reconnected = yield* seeded(workspaceId, "facebook", {
            grantedBy: userId,
          });

          // The same request, as Meta retries it or anyone who kept it sends
          // it: the receipt it had, and the new Page stays.
          const again = yield* DeletePlatformUserData.use((deletions) =>
            deletions.request("facebook", signed)
          );

          assert.deepStrictEqual(again, first);
          assert.deepStrictEqual(yield* channelIdsIn(workspaceId), [
            reconnected.id,
          ]);

          // A new request of theirs deletes it.
          const next = yield* DeletePlatformUserData.use((deletions) =>
            deletions.request(
              "facebook",
              request(userId, metaApp.appSecret, 1_780_990_600)
            )
          );

          assert.notStrictEqual(next.deletion.code, first.deletion.code);
          assert.strictEqual(next.deletion.channelsDeleted, 1);
          assert.deepStrictEqual(yield* channelIdsIn(workspaceId), []);
        })
    );

    it.effect("carry out once the same request sent twice at once", () =>
      Effect.gen(function* together() {
        const workspaceId = yield* freshWorkspace;
        const userId = userIdOf(workspaceId);
        const signed = request(userId, metaApp.appSecret);

        yield* seeded(workspaceId, "facebook", { grantedBy: userId });
        yield* seeded(workspaceId, "instagram", { grantedBy: userId });

        const [one, other] = yield* Effect.all(
          [signed, signed].map((sent) =>
            DeletePlatformUserData.use((deletions) =>
              deletions.request("facebook", sent)
            )
          ),
          { concurrency: 2 }
        );

        assert.deepStrictEqual(one, other);
        assert.strictEqual(one?.deletion.channelsDeleted, 2);
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

    it.effect(
      "delete an Instagram Login account by either of its ids, and only it",
      () =>
        Effect.gen(function* instagram() {
          const workspaceId = yield* freshWorkspace;
          const appUser = userIdOf(workspaceId);
          const professional = `17841${appUser.slice(-12)}`;

          // The same professional account: by its app-scoped grant, by its
          // own id, and reached through a Page, which the main app answers
          // for.
          yield* seeded(workspaceId, "instagram", {
            accountId: `${professional}1`,
            connection: "instagramLogin",
            grantedBy: appUser,
          });

          yield* seeded(workspaceId, "instagram", {
            accountId: professional,
            connection: "instagramLogin",
            grantedBy: `${appUser}7`,
          });

          const viaPage = yield* seeded(workspaceId, "instagram", {
            accountId: `${professional}2`,
            connection: "facebookLogin",
            grantedBy: appUser,
          });

          const byAppUser = yield* DeletePlatformUserData.use((deletions) =>
            deletions.request(
              "instagram",
              request(appUser, instagramApp.appSecret)
            )
          );

          const byAccount = yield* DeletePlatformUserData.use((deletions) =>
            deletions.request(
              "instagram",
              request(professional, instagramApp.appSecret)
            )
          );

          assert.strictEqual(byAppUser.deletion.app, "instagram");
          assert.strictEqual(byAppUser.deletion.channelsDeleted, 1);
          assert.strictEqual(byAccount.deletion.channelsDeleted, 1);
          assert.deepStrictEqual(yield* channelIdsIn(workspaceId), [
            viaPage.id,
          ]);
        })
    );

    it.effect("leave Instagram Login accounts to the Instagram app", () =>
      Effect.gen(function* facebookOnly() {
        const workspaceId = yield* freshWorkspace;
        const userId = userIdOf(workspaceId);

        const direct = yield* seeded(workspaceId, "instagram", {
          connection: "instagramLogin",
          grantedBy: userId,
        });

        yield* seeded(workspaceId, "instagram", {
          connection: "facebookLogin",
          grantedBy: userId,
        });

        const receipt = yield* DeletePlatformUserData.use((deletions) =>
          deletions.request("facebook", request(userId, metaApp.appSecret))
        );

        assert.strictEqual(receipt.deletion.channelsDeleted, 1);
        assert.deepStrictEqual(yield* channelIdsIn(workspaceId), [direct.id]);
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
          `https://peal.test/data-deletion/${confirmation.confirmation_code}`
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

// A day after the synthetic channels were connected: a request made then
// is about the tokens they hold.
const afterConnecting = 1_781_600_000;

const statusesIn = (workspaceId: WorkspaceId) =>
  ChannelRepository.use((channels) => channels.list(workspaceId)).pipe(
    Effect.map((channels) =>
      channels.map(({ id, status }) => ({ id, status: status._tag }))
    )
  );

layer(deletionsWith({ threads: true }))(
  "Meta's deauthorization requests",
  (it) => {
    it.effect(
      "mark the channels a user removed Peal from to reconnect, and tell",
      () =>
        Effect.gen(function* deauthorizes() {
          const workspaceId = yield* freshWorkspace;
          const userId = userIdOf(workspaceId);

          const direct = yield* seeded(workspaceId, "instagram", {
            accountId: userId,
            connection: "instagramLogin",
          });

          const viaPage = yield* seeded(workspaceId, "instagram", {
            connection: "facebookLogin",
            grantedBy: userId,
          });

          const marked = yield* DeauthorizePlatformUser.use((users) =>
            users.deauthorize(
              "instagram",
              request(userId, instagramApp.appSecret, afterConnecting)
            )
          );

          assert.strictEqual(marked, 1);
          assert.sameDeepMembers(yield* statusesIn(workspaceId), [
            { id: direct.id, status: "refreshNeeded" },
            { id: viaPage.id, status: "active" },
          ]);

          const notices = yield* RecordedNotices.use((recorded) =>
            recorded.of(workspaceId)
          );

          assert.deepStrictEqual(notices, [
            {
              channelId: direct.id,
              expiresAt: Option.none(),
              kind: "reconnectRequired",
            },
          ]);
        })
    );

    it.effect(
      "leave a channel changed since the request, and mark nothing twice",
      () =>
        Effect.gen(function* replayed() {
          const workspaceId = yield* freshWorkspace;
          const userId = userIdOf(workspaceId);

          // Connected after the request was made, as by reconnecting it.
          const reconnected = yield* seeded(workspaceId, "facebook", {
            grantedBy: userId,
          });

          const old = request(userId, metaApp.appSecret, 1_780_000_000);

          const none = yield* DeauthorizePlatformUser.use((users) =>
            users.deauthorize("facebook", old)
          );

          assert.strictEqual(none, 0);
          assert.deepStrictEqual(yield* statusesIn(workspaceId), [
            { id: reconnected.id, status: "active" },
          ]);

          const recent = request(userId, metaApp.appSecret, afterConnecting);

          const first = yield* DeauthorizePlatformUser.use((users) =>
            users.deauthorize("facebook", recent)
          );

          const again = yield* DeauthorizePlatformUser.use((users) =>
            users.deauthorize("facebook", recent)
          );

          assert.strictEqual(first, 1);
          assert.strictEqual(again, 0);
          assert.lengthOf(
            yield* RecordedNotices.use((recorded) => recorded.of(workspaceId)),
            1
          );
        })
    );

    it.effect("answer Meta through the API, refusing a forged request", () =>
      Effect.gen(function* api() {
        const workspaceId = yield* freshWorkspace;
        const userId = userIdOf(workspaceId);

        const channel = yield* seeded(workspaceId, "threads", {
          accountId: userId,
        });

        const client = yield* HttpApiTest.groups(Api, ["dataDeletion"]).pipe(
          Effect.provide(
            Layer.mergeAll(
              DataDeletionHandlers,
              anonymousSecurityTest,
              HttpServer.layerServices
            )
          )
        );

        const refused = yield* Effect.flip(
          client.dataDeletion.deauthorize({
            params: { app: "threads" },
            payload: { signed_request: request(userId, metaApp.appSecret) },
          })
        );

        assert.strictEqual(refused._tag, "SignedRequestRefused");

        yield* client.dataDeletion.deauthorize({
          params: { app: "threads" },
          payload: {
            signed_request: request(
              userId,
              threadsApp.appSecret,
              afterConnecting
            ),
          },
        });

        assert.deepStrictEqual(yield* statusesIn(workspaceId), [
          { id: channel.id, status: "refreshNeeded" },
        ]);
      }).pipe(Effect.scoped)
    );
  }
);
