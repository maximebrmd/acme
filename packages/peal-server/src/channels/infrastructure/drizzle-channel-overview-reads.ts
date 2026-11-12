import { sql } from "drizzle-orm";
import { Effect, Layer, Schema } from "effect";

import { ChannelOverviewReads } from "#channels/application/channel-overview-reads.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { ChannelIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { PlatformSchema } from "#shared/domain/platform.ts";
import { anyUuid } from "#shared/infrastructure/any-uuid.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { channels } from "./schema.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

const counted = (condition: ReturnType<typeof sql>) =>
  sql<number>`(count(*) FILTER (WHERE ${condition}))::int`;

const decodePlatforms = Schema.decodeUnknownEffect(
  Schema.Array(
    Schema.Struct({ channelId: ChannelIdSchema, platform: PlatformSchema })
  )
);

/**
 * The channels' counts and platforms across workspaces, one query each,
 * every id in one parameter (`anyUuid`): on the index a workspace's
 * channels lead with, and on the channels' ids.
 */
export const DrizzleChannelOverviewReads = Layer.effect(
  ChannelOverviewReads,
  Effect.gen(function* DrizzleChannelOverviewReads() {
    const db = yield* Drizzle;

    return ChannelOverviewReads.of({
      platformsOf: (channelIds) =>
        db
          .select({ channelId: channels.id, platform: channels.platform })
          .from(channels)
          .where(anyUuid(channels.id, channelIds))
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap((rows) => decodePlatforms(rows).pipe(Effect.orDie)),
            Effect.map(
              (rows) =>
                new Map(
                  rows.map(({ channelId, platform }) => [channelId, platform])
                )
            ),
            Effect.withSpan("ChannelOverviewReads.platformsOf")
          ),
      statesIn: (workspaceIds) =>
        db
          .select({
            connected: sql<number>`count(*)::int`,
            off: counted(sql`${channels.status} = 'disabled'`),
            toReconnect: counted(sql`${channels.status} = 'refreshNeeded'`),
            workspaceId: channels.workspaceId,
          })
          .from(channels)
          .where(anyUuid(channels.workspaceId, workspaceIds))
          .groupBy(channels.workspaceId)
          .pipe(
            Effect.mapError(failed),
            Effect.map(
              (rows) =>
                new Map(
                  rows.map(({ workspaceId, ...counts }) => [
                    WorkspaceIdSchema.make(workspaceId),
                    counts,
                  ])
                )
            ),
            Effect.withSpan("ChannelOverviewReads.statesIn")
          ),
    });
  })
);
