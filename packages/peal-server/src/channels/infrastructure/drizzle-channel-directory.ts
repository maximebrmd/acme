import { and, asc, gt, inArray } from "drizzle-orm";
import { Effect, Layer, Option, Schema } from "effect";

import { ChannelDirectory } from "#channels/application/channel-directory.ts";
import { platforms, PlatformSchema } from "#channels/domain/platform.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { ChannelIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { channels } from "./schema.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

const decodeListed = Schema.decodeUnknownEffect(
  Schema.Array(
    Schema.Struct({
      channelId: ChannelIdSchema,
      platform: PlatformSchema,
      workspaceId: WorkspaceIdSchema,
    })
  )
);

/** ChannelDirectory on the channels table, by its primary key. */
export const DrizzleChannelDirectory = Layer.effect(
  ChannelDirectory,
  Effect.gen(function* DrizzleChannelDirectory() {
    const db = yield* Drizzle;

    return ChannelDirectory.of({
      after: Effect.fn("ChannelDirectory.after")(function* after(last, limit) {
        const rows = yield* db
          .select({
            channelId: channels.id,
            platform: channels.platform,
            workspaceId: channels.workspaceId,
          })
          .from(channels)
          // Social channels only: a website's is followed by none of them.
          .where(
            and(
              inArray(channels.platform, [...platforms]),
              last.pipe(
                Option.map((id) => gt(channels.id, id)),
                Option.getOrUndefined
              )
            )
          )
          .orderBy(asc(channels.id))
          .limit(limit)
          .pipe(Effect.mapError(failed));

        return yield* decodeListed(rows).pipe(Effect.orDie);
      }),
    });
  })
);
