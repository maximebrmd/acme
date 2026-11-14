import { asc, countDistinct, gt, sql } from "drizzle-orm";
import { Effect, Layer, Option, Schema } from "effect";

import { SharedPlatformAccounts } from "#channels/application/shared-platform-accounts.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { ChannelPlatformSchema } from "#shared/domain/platform.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { channels } from "./schema.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

const decodeRows = Schema.decodeUnknownEffect(
  Schema.Array(
    Schema.Struct({
      accountId: Schema.String,
      platform: ChannelPlatformSchema,
      workspaceIds: Schema.Array(WorkspaceIdSchema),
    })
  )
);

/**
 * SharedPlatformAccounts on the channels table: grouped by platform and
 * account id, those held by two workspaces or more, paged by that key.
 */
export const DrizzleSharedPlatformAccounts = Layer.effect(
  SharedPlatformAccounts,
  Effect.gen(function* DrizzleSharedPlatformAccounts() {
    const db = yield* Drizzle;

    return SharedPlatformAccounts.of({
      page: (after, limit) =>
        db
          .select({
            accountId: channels.accountId,
            platform: channels.platform,
            workspaceIds: sql<
              readonly string[]
            >`array_agg(DISTINCT ${channels.workspaceId}::text ORDER BY ${channels.workspaceId}::text)`,
          })
          .from(channels)
          .where(
            Option.getOrUndefined(
              after.pipe(
                Option.map(({ accountId, platform }) =>
                  gt(
                    sql`(${channels.platform}, ${channels.accountId})`,
                    sql`(${platform}, ${accountId})`
                  )
                )
              )
            )
          )
          .groupBy(channels.platform, channels.accountId)
          .having(gt(countDistinct(channels.workspaceId), 1))
          .orderBy(asc(channels.platform), asc(channels.accountId))
          .limit(limit)
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap((rows) => decodeRows(rows).pipe(Effect.orDie)),
            Effect.withSpan("SharedPlatformAccounts.page")
          ),
    });
  })
);
