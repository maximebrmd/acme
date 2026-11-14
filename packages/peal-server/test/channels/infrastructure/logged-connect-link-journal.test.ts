import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer, Option } from "effect";

import { ActivityLog } from "#activity/application/activity-log.ts";
import { ConnectLinkJournal } from "#channels/application/connect-link-journal.ts";
import { ConnectLinkIdSchema } from "#channels/domain/connect-link-id.ts";
import { ConnectLink } from "#channels/domain/connect-link.ts";
import { LoggedConnectLinkJournal } from "#channels/infrastructure/logged-connect-link-journal.ts";
import { newId } from "#shared/application/ids.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { ActivityMemoryTest, firstPage } from "#test/activity/support.ts";
import { actorIn, freshWorkspace } from "#test/channels/support.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// What a connect link leaves in its workspace's activity log once it
// connected accounts: the link, never whoever held it.

const Test = LoggedConnectLinkJournal.pipe(
  Layer.provideMerge(ActivityMemoryTest)
);

const usedLink = Effect.fn("usedLink")(function* usedLink(
  workspaceId: WorkspaceId
) {
  const now = yield* DateTime.now;

  return new ConnectLink({
    browser: Option.none(),
    channelId: Option.none(),
    connectedChannels: [],
    connectedPlatforms: [],
    connection: Option.none(),
    createdAt: now,
    createdBy: Option.none(),
    expiresAt: DateTime.add(now, { hours: 1 }),
    failure: Option.none(),
    id: yield* newId(ConnectLinkIdSchema),
    locale: Option.none(),
    platforms: ["mastodon"],
    returnUrl: Option.none(),
    startedPlatform: Option.some("mastodon"),
    starts: 1,
    status: { _tag: "pending" },
    workspaceId,
  });
});

layer(Test)("a connect link's connections in the activity log", (it) => {
  it.effect(
    "are the link's own, through connectLink, with the channel it connected",
    () =>
      Effect.gen(function* logged() {
        const journal = yield* ConnectLinkJournal;
        const log = yield* ActivityLog;
        const workspaceId = yield* freshWorkspace;
        const link = yield* usedLink(workspaceId);
        const one = yield* newId(ChannelIdSchema);
        const two = yield* newId(ChannelIdSchema);

        yield* journal.connected(link, [one], "complete");
        yield* journal.connected(link, [one, two], "choose");

        const { items } = yield* log.list(
          actorIn(workspaceId, permissionsFor("owner")),
          firstPage
        );

        // Newest first.
        assert.deepStrictEqual(
          items.map(
            ({ actor, application, objectIds, operation, status, via }) => ({
              actor,
              application: application.pipe(Option.map(({ id }) => id)),
              objectIds,
              operation,
              status,
              via,
            })
          ),
          [
            {
              actor: { _tag: "apiKey", apiKeyId: `connect-link:${link.id}` },
              application: Option.some(`connect-link:${link.id}`),
              // Several accounts at once: the link says which.
              objectIds: { linkId: link.id },
              operation: "hostedConnect.choose",
              status: Option.some(200),
              via: "connectLink",
            },
            {
              actor: { _tag: "apiKey", apiKeyId: `connect-link:${link.id}` },
              application: Option.some(`connect-link:${link.id}`),
              objectIds: { channelId: one, linkId: link.id },
              operation: "hostedConnect.complete",
              status: Option.some(200),
              via: "connectLink",
            },
          ]
        );
      })
  );
});
