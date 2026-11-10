import { Effect, Layer, Option } from "effect";

import { ActivityLog } from "#activity/application/activity-log.ts";
import type { ActivityEntry } from "#activity/application/activity-log.ts";
import { ActivityRecords } from "#activity/application/activity-records.ts";
import { ApplicationNames } from "#activity/application/application-names.ts";
import { DrizzleActivityEvents } from "#activity/infrastructure/drizzle-activity-events.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import { IdsLive } from "#shared/infrastructure/secure-random-ids.ts";
import { MemoryActivityEvents } from "#test/activity/fakes/memory-activity-events.ts";
import { DatabaseTest } from "#test/channels/support.ts";

/** The one API key that has a name in these tests. */
export const namedKey = "0b9c1d2e-3f4a-4b5c-8d6e-7f8091a2b3c4";

/** The one OAuth client that has a name in these tests. */
export const namedClient = "synthetic-client";

// Names as the workspace context would give them: one key and one client
// have one.
const NamesTest = Layer.succeed(
  ApplicationNames,
  ApplicationNames.of({
    apiKey: (_workspaceId, apiKeyId) =>
      Effect.succeed(
        apiKeyId === namedKey ? Option.some("Synthetic key") : Option.none()
      ),
    client: (clientId) =>
      Effect.succeed(
        clientId === namedClient
          ? Option.some("Synthetic client")
          : Option.none()
      ),
  })
);

const UseCases = Layer.mergeAll(ActivityLog.layer, ActivityRecords.layer);

/** The activity log on a store in memory. */
export const ActivityMemoryTest = UseCases.pipe(
  Layer.provide(Layer.mergeAll(MemoryActivityEvents, NamesTest)),
  Layer.provideMerge(IdsLive)
);

/** The activity log on Postgres. */
export const ActivityTest = UseCases.pipe(
  Layer.provide(Layer.mergeAll(DrizzleActivityEvents, NamesTest)),
  Layer.provideMerge(DatabaseTest)
);

/** A member's change in the web app, unless the test says otherwise. */
export const changeBy = (
  workspaceId: WorkspaceId,
  userId: UserId,
  entry: Partial<ActivityEntry> = {}
): ActivityEntry => ({
  actor: { _tag: "user", userId: Option.some(userId) },
  clientId: Option.none(),
  errorCode: Option.none(),
  impersonated: false,
  named: {},
  operation: "posts.create",
  requestId: Option.none(),
  status: Option.some(201),
  via: "session",
  workspaceId,
  ...entry,
});

/** Every event of a page's request, unless the test says otherwise. */
export const firstPage = {
  actorId: Option.none<string>(),
  after: Option.none(),
  limit: 50,
  operation: Option.none<string>(),
};
