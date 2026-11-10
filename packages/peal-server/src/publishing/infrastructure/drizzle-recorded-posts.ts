import { and, eq, inArray } from "drizzle-orm";
import { Effect, Layer } from "effect";

import { RecordedPosts } from "#publishing/application/recorded-posts.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { postTargets } from "./schema.ts";

/** RecordedPosts on the targets' rows, where each platform's id is kept. */
export const DrizzleRecordedPosts = Layer.effect(
  RecordedPosts,
  Effect.gen(function* DrizzleRecordedPosts() {
    const db = yield* Drizzle;

    return RecordedPosts.of({
      among: (channelId, platformPostIds) =>
        platformPostIds.length === 0
          ? Effect.succeed(new Set<string>())
          : db
              .select({ platformPostId: postTargets.platformPostId })
              .from(postTargets)
              .where(
                and(
                  eq(postTargets.channelId, channelId),
                  inArray(postTargets.platformPostId, [...platformPostIds])
                )
              )
              .pipe(
                Effect.mapError((cause) => new DatabaseError({ cause })),
                Effect.map(
                  (rows) =>
                    new Set(
                      rows.flatMap(({ platformPostId }) =>
                        platformPostId === null ? [] : [platformPostId]
                      )
                    )
                )
              ),
    });
  })
);
