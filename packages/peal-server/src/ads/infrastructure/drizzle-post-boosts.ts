import { and, eq, inArray, sql } from "drizzle-orm";
import { Effect, Layer } from "effect";

import { PostBoosts } from "#ads/application/post-boosts.ts";
import type { BoostState } from "#ads/domain/boost.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { failed } from "./rows.ts";
import { boosts } from "./schema.ts";

// The states of a boost that is not over (`isFinal` is false for them).
const notOver: readonly BoostState["_tag"][] = [
  "requested",
  "active",
  "paused",
  "unconfirmed",
];

/** PostBoosts on the ads schema. */
export const DrizzlePostBoosts = Layer.effect(
  PostBoosts,
  Effect.gen(function* DrizzlePostBoosts() {
    const db = yield* Drizzle;

    return PostBoosts.of({
      // By workspace and post first, as `boosts_post` holds them.
      notOverOn: ({ postId, targetId, workspaceId }) =>
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(boosts)
          .where(
            and(
              eq(boosts.workspaceId, workspaceId),
              eq(boosts.postId, postId),
              eq(boosts.targetId, targetId),
              inArray(boosts.state, [...notOver])
            )
          )
          .pipe(
            Effect.mapError(failed),
            Effect.map(([row]) => row?.count ?? 0)
          ),
    });
  })
);
