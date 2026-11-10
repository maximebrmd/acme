import { and, asc, eq, gt, inArray, lt, ne } from "drizzle-orm";
import { DateTime, Effect, Layer, Option } from "effect";
import { Digest } from "effect/crypto";
import { SqlClient } from "effect/sql";

import { ContentFingerprints } from "#publishing/application/content-fingerprints.ts";
import type {
  ChannelContent,
  FingerprintSearch,
} from "#publishing/application/content-fingerprints.ts";
import type { Duplicate } from "#publishing/domain/duplicate-window.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { PostIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { posts, postTargets } from "./schema.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

const date = (instant: DateTime.Utc) => DateTime.toDateUtc(instant);

const encoder = new TextEncoder();

/**
 * Content digests on the targets' rows: the SHA-256 of what each sends to
 * its channel.
 */
export const DrizzleContentFingerprints = Layer.effect(
  ContentFingerprints,
  Effect.gen(function* DrizzleContentFingerprints() {
    const db = yield* Drizzle;
    const client = yield* SqlClient.SqlClient;
    const digest = yield* Digest.Digest;

    const digested = <A extends ChannelContent>(targets: readonly A[]) =>
      Effect.all(
        targets.map((target) =>
          digest.digestHex(Digest.sha256, encoder.encode(target.content)).pipe(
            Effect.mapError(failed),
            Effect.map((contentDigest) => ({ ...target, contentDigest }))
          )
        )
      );

    // The turn of whoever searches for, or keeps, this content on this
    // channel, until its transaction ends.
    const turnFor = ({
      channelId,
      contentDigest,
    }: {
      readonly channelId: ChannelId;
      readonly contentDigest: string;
    }) =>
      client`SELECT pg_advisory_xact_lock(hashtext('peal-server/publishing/duplicate-content'), hashtext(${`${channelId}:${contentDigest}`}))`.pipe(
        Effect.mapError(failed)
      );

    // In one order, so two posts for the same channels never wait for
    // each other.
    const inOrder = <A extends ChannelContent>(targets: readonly A[]) =>
      digested(targets).pipe(
        Effect.map((found) =>
          found.toSorted((left, right) =>
            `${left.channelId}:${left.contentDigest}`.localeCompare(
              `${right.channelId}:${right.contentDigest}`
            )
          )
        )
      );

    const searching =
      (holding: boolean) =>
      ({ after, before, contents, except, workspaceId }: FingerprintSearch) =>
        Effect.gen(function* duplicatesOf() {
          const wanted = yield* inOrder(contents);

          const found: Duplicate[] = [];

          for (const { channelId, contentDigest } of wanted) {
            if (holding) {
              yield* turnFor({ channelId, contentDigest });
            }

            const [nearest] = yield* db
              .select({ postId: posts.id })
              .from(postTargets)
              .innerJoin(posts, eq(posts.id, postTargets.postId))
              .where(
                and(
                  eq(postTargets.channelId, channelId),
                  eq(postTargets.contentDigest, contentDigest),
                  inArray(postTargets.status, [
                    "pending",
                    "publishing",
                    "published",
                    "unconfirmed",
                  ]),
                  eq(posts.workspaceId, workspaceId),
                  except.pipe(
                    Option.map((postId) => ne(posts.id, postId)),
                    Option.getOrUndefined
                  ),
                  inArray(posts.status, [
                    // A post that waits for an approval keeps its time, and
                    // goes out once approved.
                    "awaitingApproval",
                    "scheduled",
                    "publishing",
                    "finished",
                  ]),
                  gt(posts.scheduledAt, date(after)),
                  lt(posts.scheduledAt, date(before))
                )
              )
              .orderBy(asc(posts.scheduledAt), asc(posts.id))
              .limit(1)
              .pipe(Effect.mapError(failed));

            if (nearest !== undefined) {
              found.push({
                channelId,
                postId: PostIdSchema.make(nearest.postId),
              });
            }
          }

          // As the post lists its channels.
          return contents.flatMap(({ channelId }) =>
            found.filter((duplicate) => duplicate.channelId === channelId)
          );
        }).pipe(Effect.withSpan("ContentFingerprints.duplicatesOf"));

    return ContentFingerprints.of({
      duplicatesOf: searching(true),
      glance: searching(false),
      record: (targets) =>
        inOrder(targets).pipe(
          Effect.flatMap(
            Effect.forEach((target) =>
              turnFor(target).pipe(
                Effect.andThen(
                  db
                    .update(postTargets)
                    .set({ contentDigest: target.contentDigest })
                    .where(eq(postTargets.id, target.targetId))
                    .pipe(Effect.mapError(failed))
                )
              )
            )
          ),
          Effect.asVoid,
          Effect.withSpan("ContentFingerprints.record")
        ),
    });
  })
).pipe(Layer.provide(Digest.layerWebCrypto));
