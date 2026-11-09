import { assert, describe, expect, it, layer } from "@effect/vitest";
import {
  Api,
  ChannelNotFound,
  ConnectFailed,
  Forbidden,
  OAuthClientNotPublished,
} from "acme-contract";
import type { Member } from "acme-contract";
import { DateTime, Effect, Layer, Option } from "effect";
import { HttpServer } from "effect/http";
import { HttpApiTest, OpenApi } from "effect/http-api";

import {
  ChannelOAuthHandlers,
  ChannelsHandlers,
} from "#channels/api/channels.ts";
import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { DisconnectChannel } from "#channels/application/disconnect-channel.ts";
import { ListChannels } from "#channels/application/list-channels.ts";
import { OAuthClientDocuments } from "#channels/application/oauth-client-documents.ts";
import type { TokenLifetime } from "#channels/domain/channel.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { MastodonConnectTest } from "#test/channels/connect-support.ts";
import { fakeMastodon } from "#test/channels/fakes/fake-mastodon.ts";
import {
  freshChannel,
  freshWorkspace,
  memberOf,
  nonRefreshable,
  refreshable,
  syntheticCredentials,
} from "#test/channels/support.ts";
import {
  anonymousSecurityTest,
  securityTest,
} from "#workspace/api/security.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

const UseCasesTest = Layer.mergeAll(
  ListChannels.layer,
  DisconnectChannel.layer
).pipe(Layer.provideMerge(MastodonConnectTest));

// A client of the channels endpoints whose every request acts as the member,
// as the WorkspaceAccess middleware would hand them to the handlers.
const clientAs = (member: Member) =>
  HttpApiTest.groups(Api, ["channels"]).pipe(
    Effect.provide(
      Layer.mergeAll(
        ChannelsHandlers.pipe(Layer.provideMerge(securityTest(member))),
        HttpServer.layerServices
      )
    )
  );

const owner = (workspaceId: WorkspaceId) =>
  memberOf(workspaceId, permissionsFor("owner"));

// Reads channels, and may not disconnect them.
const viewer = (workspaceId: WorkspaceId) =>
  memberOf(workspaceId, permissionsFor("viewer"));

// May do nothing with channels.
const postReader = (workspaceId: WorkspaceId) =>
  memberOf(workspaceId, ["post:read"]);

const connected = Effect.fn("connected")(function* connected(
  workspaceId: WorkspaceId,
  token: TokenLifetime = nonRefreshable
) {
  const channel = yield* freshChannel(workspaceId, { token });

  yield* ChannelRepository.use((channels) =>
    channels.insert(channel, syntheticCredentials(channel))
  );

  return channel;
});

const channelIdsOf = Effect.fn("channelIdsOf")(function* channelIdsOf(
  workspaceId: WorkspaceId
) {
  const channels = yield* ChannelRepository.use((repository) =>
    repository.list(workspaceId)
  );

  return channels.map((channel) => channel.id);
});

layer(UseCasesTest)("the channels endpoints", (it) => {
  it.effect("list the member's channels, without their tokens", () =>
    Effect.gen(function* lists() {
      const workspaceId = yield* freshWorkspace;
      const expiring = yield* connected(workspaceId);
      const renewing = yield* connected(workspaceId, refreshable);
      const client = yield* clientAs(owner(workspaceId));
      const params = { workspaceId };

      const listed = yield* client.channels.list({ params });

      assert.deepStrictEqual(listed, [
        {
          avatarUrl: `https://social.example/avatars/${expiring.id}.png`,
          displayName: "Acme Example",
          handle: "@acme_example",
          id: expiring.id,
          platform: "mastodon",
          status: { _tag: "active" },
          tokenExpiresAt: DateTime.makeUnsafe("2026-08-14T07:00:00.123Z"),
        },
        {
          avatarUrl: `https://social.example/avatars/${renewing.id}.png`,
          displayName: "Acme Example",
          handle: "@acme_example",
          id: renewing.id,
          platform: "mastodon",
          status: { _tag: "active" },
          tokenExpiresAt: null,
        },
      ]);

      const response = yield* client.channels.list({
        params,
        responseMode: "response-only",
      });

      const body = yield* response.text;

      assert.notInclude(body, "synthetic-iv");
      assert.notInclude(body, "scopes");
      assert.notInclude(body, expiring.accountId);
    })
  );

  it.effect("let a viewer read the channels", () =>
    Effect.gen(function* viewerLists() {
      const workspaceId = yield* freshWorkspace;
      const channel = yield* connected(workspaceId);
      const client = yield* clientAs(viewer(workspaceId));

      const listed = yield* client.channels.list({ params: { workspaceId } });

      assert.deepStrictEqual(
        listed.map(({ id }) => id),
        [channel.id]
      );
    })
  );

  it.effect("answer 403 to a member without channel:read", () =>
    Effect.gen(function* forbidden() {
      const workspaceId = yield* freshWorkspace;

      yield* connected(workspaceId);

      const client = yield* clientAs(postReader(workspaceId));
      const params = { workspaceId };

      assert.instanceOf(
        yield* Effect.flip(client.channels.list({ params })),
        Forbidden
      );

      const response = yield* client.channels.list({
        params,
        responseMode: "response-only",
      });

      assert.strictEqual(response.status, 403);
    })
  );

  it.effect(
    "show a member only their own workspace's channels, whatever the path",
    () =>
      Effect.gen(function* otherWorkspace() {
        const theirs = yield* freshWorkspace;
        const mine = yield* freshWorkspace;
        const channel = yield* connected(mine);

        yield* connected(theirs);

        const client = yield* clientAs(owner(mine));

        const listed = yield* client.channels.list({
          params: { workspaceId: theirs },
        });

        assert.deepStrictEqual(
          listed.map(({ id }) => id),
          [channel.id]
        );
      })
  );

  it.effect("disconnect a channel, answering 204", () =>
    Effect.gen(function* disconnects() {
      const workspaceId = yield* freshWorkspace;
      const channel = yield* connected(workspaceId);
      const kept = yield* connected(workspaceId);
      const client = yield* clientAs(owner(workspaceId));
      const params = { channelId: channel.id, workspaceId };

      const response = yield* client.channels.disconnect({
        params,
        responseMode: "response-only",
      });

      assert.strictEqual(response.status, 204);
      assert.deepStrictEqual(yield* channelIdsOf(workspaceId), [kept.id]);
    })
  );

  it.effect.each([
    { channelId: "00000000-0000-7000-8000-00000000abcd", label: "no channel" },
    { channelId: "not-a-channel-id", label: "no channel id" },
  ])("answer 404 to the disconnection of $label", ({ channelId }) =>
    Effect.gen(function* notFound() {
      const workspaceId = yield* freshWorkspace;
      const client = yield* clientAs(owner(workspaceId));
      const params = { channelId, workspaceId };

      assert.instanceOf(
        yield* Effect.flip(client.channels.disconnect({ params })),
        ChannelNotFound
      );

      const response = yield* client.channels.disconnect({
        params,
        responseMode: "response-only",
      });

      assert.strictEqual(response.status, 404);
    })
  );

  it.effect(
    "answer 404 to the disconnection of another workspace's channel",
    () =>
      Effect.gen(function* otherWorkspace() {
        const theirs = yield* freshWorkspace;
        const channel = yield* connected(theirs);
        const mine = yield* freshWorkspace;
        const client = yield* clientAs(owner(mine));

        const error = yield* Effect.flip(
          client.channels.disconnect({
            params: { channelId: channel.id, workspaceId: theirs },
          })
        );

        assert.instanceOf(error, ChannelNotFound);
        assert.deepStrictEqual(yield* channelIdsOf(theirs), [channel.id]);
      })
  );

  it.effect("answer 403 to a member without channel:disconnect", () =>
    Effect.gen(function* forbidden() {
      const workspaceId = yield* freshWorkspace;
      const channel = yield* connected(workspaceId);
      const params = { channelId: channel.id, workspaceId };

      for (const member of [viewer(workspaceId), postReader(workspaceId)]) {
        const client = yield* clientAs(member);

        assert.instanceOf(
          yield* Effect.flip(client.channels.disconnect({ params })),
          Forbidden
        );
      }

      assert.deepStrictEqual(yield* channelIdsOf(workspaceId), [channel.id]);
    })
  );

  it.effect("connect a Mastodon account through the callback", () =>
    Effect.gen(function* connects() {
      const instance = yield* fakeMastodon();
      const workspaceId = yield* freshWorkspace;
      const client = yield* clientAs(owner(workspaceId));
      const params = { platform: "mastodon" as const, workspaceId };

      const { authorizationUrl } = yield* client.channels.connect({
        params,
        payload: { instance: instance.url },
      });

      const back = instance.approve(authorizationUrl);

      const outcome = yield* client.channels.completeConnect({
        params,
        payload: { code: back.code, state: back.state },
      });

      assert(outcome._tag === "connected");

      const { channel } = outcome;

      assert.strictEqual(channel.platform, "mastodon");
      assert.strictEqual(
        channel.handle,
        `@alice@${new URL(instance.url).host}`
      );
      assert.deepStrictEqual(channel.status, { _tag: "active" });
      assert.isNull(channel.tokenExpiresAt);
      assert.deepStrictEqual(yield* channelIdsOf(workspaceId), [channel.id]);
    }).pipe(Effect.scoped)
  );

  it.effect("answer 422 invalidState to a callback for no connection", () =>
    Effect.gen(function* badState() {
      const workspaceId = yield* freshWorkspace;
      const client = yield* clientAs(owner(workspaceId));

      const request = {
        params: { platform: "mastodon" as const, workspaceId },
        payload: { code: "code-1", state: "made-up" },
      };

      const error = yield* Effect.flip(
        client.channels.completeConnect(request)
      );

      assert.instanceOf(error, ConnectFailed);
      assert.strictEqual(error.reason, "invalidState");

      const response = yield* client.channels.completeConnect({
        ...request,
        responseMode: "response-only",
      });

      assert.strictEqual(response.status, 422);
    })
  );

  it.effect(
    "list the platforms the server connects, to those who connect",
    () =>
      Effect.gen(function* platforms() {
        const workspaceId = yield* freshWorkspace;
        const params = { workspaceId };

        const listed = yield* (yield* clientAs(
          owner(workspaceId)
        )).channels.platforms({ params });

        assert.deepStrictEqual(listed, { platforms: ["mastodon"] });

        const refused = yield* Effect.flip(
          (yield* clientAs(viewer(workspaceId))).channels.platforms({ params })
        );

        assert.instanceOf(refused, Forbidden);
      })
  );

  it.effect("answer 422 invalidState to a choice nobody was offered", () =>
    Effect.gen(function* badChoice() {
      const workspaceId = yield* freshWorkspace;
      const client = yield* clientAs(owner(workspaceId));

      const error = yield* Effect.flip(
        client.channels.chooseAccounts({
          params: { platform: "facebook", workspaceId },
          payload: { accountIds: ["101"], selection: "made-up" },
        })
      );

      assert.instanceOf(error, ConnectFailed);
      assert.strictEqual(error.reason, "invalidState");
    })
  );

  it.effect("answer 422 with the reason a connection cannot start", () =>
    Effect.gen(function* refused() {
      const workspaceId = yield* freshWorkspace;
      const client = yield* clientAs(owner(workspaceId));

      const reasons = yield* Effect.all(
        [
          client.channels.connect({
            params: { platform: "mastodon", workspaceId },
            payload: { instance: "not a server" },
          }),
          client.channels.connect({
            params: { platform: "mastodon", workspaceId },
            payload: {},
          }),
          client.channels.connect({
            params: { platform: "linkedin", workspaceId },
            payload: {},
          }),
        ].map((attempt) =>
          attempt.pipe(
            Effect.flip,
            Effect.map((error) =>
              error instanceof ConnectFailed ? error.reason : error._tag
            )
          )
        )
      );

      assert.deepStrictEqual(reasons, [
        "invalidInstance",
        "invalidInstance",
        "platformNotSupported",
      ]);
    })
  );

  it.effect("answer 403 to connecting without channel:connect", () =>
    Effect.gen(function* forbidden() {
      const workspaceId = yield* freshWorkspace;
      const client = yield* clientAs(viewer(workspaceId));

      assert.instanceOf(
        yield* Effect.flip(
          client.channels.connect({
            params: { platform: "mastodon", workspaceId },
            payload: { instance: "mastodon.example" },
          })
        ),
        Forbidden
      );
    })
  );

  it.effect("answer 404 to reconnecting a channel the workspace lacks", () =>
    Effect.gen(function* missing() {
      const workspaceId = yield* freshWorkspace;
      const client = yield* clientAs(owner(workspaceId));

      assert.instanceOf(
        yield* Effect.flip(
          client.channels.reconnect({
            params: { channelId: "not-a-channel-id", workspaceId },
          })
        ),
        ChannelNotFound
      );
    })
  );
});

// The client documents, for a server with and without Bluesky client keys.
const documentsClient = (documents: OAuthClientDocuments["Service"]) =>
  HttpApiTest.groups(Api, ["channelOAuth"]).pipe(
    Effect.provide(
      Layer.mergeAll(
        ChannelOAuthHandlers.pipe(
          Layer.provide(Layer.succeed(OAuthClientDocuments, documents))
        ),
        // Nobody signs in to fetch them.
        anonymousSecurityTest,
        HttpServer.layerServices
      )
    )
  );

layer(HttpServer.layerServices)("the OAuth client documents", (it) => {
  it.effect("answer 404 on a server without client keys", () =>
    Effect.gen(function* unpublished() {
      const client = yield* documentsClient({ bluesky: Option.none() });

      assert.instanceOf(
        yield* Effect.flip(client.channelOAuth.blueskyClientMetadata()),
        OAuthClientNotPublished
      );
      assert.instanceOf(
        yield* Effect.flip(client.channelOAuth.blueskyJwks()),
        OAuthClientNotPublished
      );
    })
  );

  it.effect("publish the client's metadata and public keys", () =>
    Effect.gen(function* published() {
      const metadata = {
        application_type: "web",
        client_id:
          "https://acme.test/api/channels/oauth/bluesky/client-metadata.json",
        client_name: "Acme",
        client_uri: "https://acme.test",
        dpop_bound_access_tokens: true,
        grant_types: ["authorization_code", "refresh_token"],
        jwks_uri: "https://acme.test/api/channels/oauth/bluesky/jwks.json",
        redirect_uris: ["https://acme.test/connect/bluesky/callback"],
        response_types: ["code"],
        scope: "atproto",
        token_endpoint_auth_method: "private_key_jwt",
        token_endpoint_auth_signing_alg: "ES256",
      } as const;

      const jwks = {
        keys: [
          {
            crv: "P-256",
            kid: "k1",
            kty: "EC",
            x: "synthetic-x",
            y: "synthetic-y",
          },
        ],
      };

      const client = yield* documentsClient({
        bluesky: Option.some({ jwks, metadata }),
      });

      assert.deepStrictEqual(
        yield* client.channelOAuth.blueskyClientMetadata(),
        metadata
      );
      assert.deepStrictEqual(yield* client.channelOAuth.blueskyJwks(), jwks);
    })
  );
});

// What the API reference tells clients each endpoint may answer.
const documentedStatuses = (path: string) =>
  Object.keys(OpenApi.fromApi(Api).paths[path]?.post?.responses ?? {});

describe("the channels contract", () => {
  it("lists no plan limit on reconnecting, which adds no channel", () => {
    expect(
      documentedStatuses(
        "/api/workspaces/{workspaceId}/channels/{channelId}/reconnect"
      )
    ).not.toContain("402");
    expect(
      documentedStatuses("/api/workspaces/{workspaceId}/channels/connect/{platform}")
    ).toContain("402");
  });
});
