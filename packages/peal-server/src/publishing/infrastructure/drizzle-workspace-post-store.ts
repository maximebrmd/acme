import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { DateTime, Effect, Layer, Schema } from "effect";

import { ExecutionIdSchema } from "#publishing/application/publication-scheduler.ts";
import { WorkspacePostStore } from "#publishing/application/workspace-post-store.ts";
import { PostOriginSchema } from "#publishing/domain/post-origin.ts";
import { PostStatusNameSchema } from "#publishing/domain/post-status.ts";
import { PostTargetIdSchema } from "#publishing/domain/post-target-id.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import type {
  AuthoredPostRecord,
  PostOriginRecord,
  PostRecord,
  SavedItemsRecord,
} from "#shared/application/personal-data.ts";
import { PostIdSchema } from "#shared/domain/ids.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import {
  channelDefaults,
  channelSets,
  feedReads,
  feeds,
  queues,
  recyclingRules,
  idempotencyKeys,
  livePostChanges,
  postTargets,
  posts,
  publicationCalls,
  signatures,
  tags,
} from "./schema.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

const decodeStanding = Schema.decodeUnknownEffect(
  Schema.Struct({
    execution: Schema.OptionFromNullOr(ExecutionIdSchema),
    postId: PostIdSchema,
    status: PostStatusNameSchema,
  })
);

const decodeRound = Schema.decodeUnknownEffect(
  Schema.Struct({
    inFlight: Schema.Boolean,
    round: Schema.Int,
    targetId: PostTargetIdSchema,
  })
);

// What the content columns hold, as the post repository writes them.
const MediaSchema = Schema.Array(
  Schema.Struct({ altText: Schema.String, mediaId: Schema.String })
);

const decodeMedia = Schema.decodeUnknownEffect(MediaSchema);

const OverridesSchema = Schema.Array(
  Schema.Struct({
    channelId: Schema.String,
    media: Schema.optionalKey(MediaSchema),
    text: Schema.String,
  })
);

const decodeOverrides = Schema.decodeUnknownEffect(OverridesSchema);

// The parts after the first, as the post repository writes them.
const decodeFollowUps = Schema.decodeUnknownEffect(
  Schema.Array(
    Schema.Struct({
      delaySeconds: Schema.Int,
      media: MediaSchema,
      overrides: OverridesSchema,
      text: Schema.String,
    })
  )
);

// The parts live on a target, as the post repository writes them: only
// how many there are is exported.
const decodeLiveParts = Schema.decodeUnknownEffect(
  Schema.Array(Schema.Unknown)
);

// Media as an export holds it: no alt text is null.
const exportedMedia = (media: typeof MediaSchema.Type) =>
  media.map(({ altText, mediaId }) => ({
    altText: altText === "" ? null : altText,
    mediaId,
  }));

// The texts by channel, with the media one gives its channel, if any.
const exportedOverrides = (overrides: typeof OverridesSchema.Type) =>
  overrides.map(({ channelId, media, text }) =>
    media === undefined
      ? { channelId, text }
      : { channelId, media: exportedMedia(media), text }
  );

// How a post was created or scheduled, as the post repository writes it.
const decodeOrigin = Schema.decodeUnknownEffect(
  Schema.NullOr(PostOriginSchema)
);

type PostRow = typeof posts.$inferSelect;

type TargetRow = typeof postTargets.$inferSelect;

type ChangeRow = typeof livePostChanges.$inferSelect;

// How the post was created, or scheduled, as an export holds it.
const originRecord = (row: PostRow, column: "createdVia" | "scheduledVia") =>
  decodeOrigin(row[column]).pipe(
    Effect.orDie,
    Effect.map((origin): PostOriginRecord | null =>
      origin === null
        ? null
        : {
            name: origin._tag === "web" ? null : (origin.name ?? null),
            via: origin._tag,
          }
    )
  );

// A row with the instant it was made at, as records hold instants.
const dated = <Row extends { readonly createdAt: Date }>(row: Row) => ({
  ...row,
  createdAt: DateTime.fromDateUnsafe(row.createdAt),
});

const utcOrNull = (date: Date | null) =>
  date === null ? null : DateTime.fromDateUnsafe(date);

// A post as an export holds it, with its targets among `targetRows`.
const recordOf = Effect.fnUntraced(function* recordOf(
  row: PostRow,
  targetRows: readonly TargetRow[],
  changeRows: readonly ChangeRow[]
) {
  const media = yield* decodeMedia(row.media).pipe(Effect.orDie);

  const overrides = yield* decodeOverrides(row.textOverrides).pipe(
    Effect.orDie
  );

  const followUps = yield* decodeFollowUps(row.followUps).pipe(Effect.orDie);

  const targets = yield* Effect.all(
    targetRows.flatMap((target) =>
      target.postId === row.id
        ? [
            decodeLiveParts(target.liveParts).pipe(
              Effect.orDie,
              Effect.map((live) => ({
                channelId: target.channelId,
                dropped: target.dropped,
                editedAt: utcOrNull(target.editedAt),
                finishedAt: utcOrNull(target.finishedAt),
                keptPrivate: target.keptPrivate,
                options: target.options,
                // A target published before parts were kept has its one part.
                partsLive:
                  live.length === 0 && target.status === "published"
                    ? 1
                    : live.length,
                permalink: target.permalink,
                removedAt: utcOrNull(target.removedAt),
                status: target.status,
                thumbnailNotSet: target.thumbnailNotSet,
              }))
            ),
          ]
        : []
    )
  );

  const record: PostRecord = {
    createdVia: yield* originRecord(row, "createdVia"),
    followUps: followUps.map((part) => ({
      delaySeconds: part.delaySeconds,
      media: exportedMedia(part.media),
      text: part.text,
      textOverrides: exportedOverrides(part.overrides),
    })),
    id: row.id,
    liveChanges: changeRows.flatMap((change) =>
      change.postId === row.id
        ? [
            {
              alreadyGone: change.alreadyGone,
              failureCode: change.failureCode,
              finishedAt: utcOrNull(change.finishedAt),
              kind: change.kind,
              requestedAt: DateTime.fromDateUnsafe(change.requestedAt),
              status: change.status,
              targetId: change.targetId,
            },
          ]
        : []
    ),
    media: exportedMedia(media),
    scheduledAt: utcOrNull(row.scheduledAt),
    scheduledVia: yield* originRecord(row, "scheduledVia"),
    status: row.status,
    tagIds: row.tagIds,
    targets,
    text: row.text,
    textOverrides: exportedOverrides(overrides),
    timeZone: row.scheduleZone,
  };

  return record;
});

/**
 * WorkspacePostStore on the publishing schema. Deleting a post deletes its
 * targets, their attempts and their journal rows, which reference it with
 * ON DELETE CASCADE.
 */
export const DrizzleWorkspacePostStore = Layer.effect(
  WorkspacePostStore,
  Effect.gen(function* DrizzleWorkspacePostStore() {
    const db = yield* Drizzle;

    const lockAll = Effect.fn("WorkspacePostStore.lockAll")(function* lockAll(
      workspaceId: string
    ) {
      const rows = yield* db
        .select({
          execution: posts.executionId,
          postId: posts.id,
          status: posts.status,
        })
        .from(posts)
        .where(eq(posts.workspaceId, workspaceId))
        .orderBy(asc(posts.id))
        .for("update")
        .pipe(Effect.mapError(failed));

      return yield* Effect.all(
        rows.map((row) => decodeStanding(row).pipe(Effect.orDie))
      );
    });

    // The targets of these posts, in the order they came.
    const targetsOf = (postRows: readonly PostRow[]) =>
      postRows.length === 0
        ? Effect.succeed<readonly TargetRow[]>([])
        : db
            .select()
            .from(postTargets)
            .where(
              inArray(
                postTargets.postId,
                postRows.map(({ id }) => id)
              )
            )
            .orderBy(asc(postTargets.id))
            .pipe(Effect.mapError(failed));

    // The changes asked of these posts once live, oldest first.
    const changesOf = (postRows: readonly PostRow[]) =>
      postRows.length === 0
        ? Effect.succeed<readonly ChangeRow[]>([])
        : db
            .select()
            .from(livePostChanges)
            .where(
              inArray(
                livePostChanges.postId,
                postRows.map(({ id }) => id)
              )
            )
            .orderBy(asc(livePostChanges.id))
            .pipe(Effect.mapError(failed));

    const exportAll = Effect.fn("WorkspacePostStore.exportAll")(
      function* exportAll(workspaceId: string) {
        const postRows = yield* db
          .select()
          .from(posts)
          .where(eq(posts.workspaceId, workspaceId))
          .orderBy(asc(posts.id))
          .pipe(Effect.mapError(failed));

        const targetRows = yield* targetsOf(postRows);
        const changeRows = yield* changesOf(postRows);

        return yield* Effect.all(
          postRows.map((row) => recordOf(row, targetRows, changeRows))
        );
      }
    );

    const exportAuthored = Effect.fn("WorkspacePostStore.exportAuthored")(
      function* exportAuthored(
        userId: string,
        workspaceIds: readonly string[]
      ) {
        if (workspaceIds.length === 0) {
          const none: readonly AuthoredPostRecord[] = [];

          return none;
        }

        const postRows = yield* db
          .select()
          .from(posts)
          .where(
            and(
              eq(posts.authorId, userId),
              inArray(posts.workspaceId, [...workspaceIds])
            )
          )
          .orderBy(asc(posts.id))
          .pipe(Effect.mapError(failed));

        const targetRows = yield* targetsOf(postRows);
        const changeRows = yield* changesOf(postRows);

        return yield* Effect.all(
          postRows.map((row) =>
            recordOf(row, targetRows, changeRows).pipe(
              Effect.map((record): AuthoredPostRecord => ({
                ...record,
                workspaceId: row.workspaceId,
              }))
            )
          )
        );
      }
    );

    const clearAuthor = Effect.fn("WorkspacePostStore.clearAuthor")(
      function* clearAuthor(userId: string) {
        yield* db
          .update(posts)
          .set({ authorId: null })
          .where(eq(posts.authorId, userId))
          .pipe(Effect.mapError(failed));

        // Nor that they scheduled any: how it was scheduled stays.
        yield* db
          .update(posts)
          .set({ scheduledBy: null })
          .where(eq(posts.scheduledBy, userId))
          .pipe(Effect.mapError(failed));

        // Nor that they started a rule that repeats one: the next run ends
        // it, as its starter is gone.
        yield* db
          .update(recyclingRules)
          .set({ startedBy: null })
          .where(eq(recyclingRules.startedBy, userId))
          .pipe(Effect.mapError(failed));

        // Nor that they added a feed: the next run stops it, as its
        // starter is gone.
        yield* db
          .update(feeds)
          .set({ startedBy: null })
          .where(eq(feeds.startedBy, userId))
          .pipe(Effect.mapError(failed));

        // Nor that they asked to change one once live.
        yield* db
          .update(livePostChanges)
          .set({ requestedBy: null })
          .where(eq(livePostChanges.requestedBy, userId))
          .pipe(Effect.mapError(failed));
      }
    );

    const exportSaved = Effect.fn("WorkspacePostStore.exportSaved")(
      function* exportSaved(workspaceId: string) {
        const saved: SavedItemsRecord = {
          channelDefaults: yield* db
            .select({
              channelId: channelDefaults.channelId,
              options: channelDefaults.options,
            })
            .from(channelDefaults)
            .where(eq(channelDefaults.workspaceId, workspaceId))
            .orderBy(asc(channelDefaults.channelId)),
          channelSets: (yield* db
            .select({
              channelIds: channelSets.channelIds,
              createdAt: channelSets.createdAt,
              id: channelSets.id,
              name: channelSets.name,
              options: channelSets.options,
            })
            .from(channelSets)
            .where(eq(channelSets.workspaceId, workspaceId))
            .orderBy(asc(channelSets.id))).map(dated),
          feeds: (yield* db
            .select({
              attachPicture: feeds.attachPicture,
              channelIds: feeds.channelIds,
              channelSetId: feeds.channelSetId,
              createdAt: feeds.createdAt,
              id: feeds.id,
              mode: feeds.mode,
              queueId: feeds.queueId,
              status: feeds.status,
              stopReason: feeds.stopReason,
              template: feeds.template,
              url: feeds.url,
            })
            .from(feeds)
            .where(eq(feeds.workspaceId, workspaceId))
            .orderBy(asc(feeds.id))).map(dated),
          queues: (yield* db
            .select({
              channelIds: queues.channelIds,
              channelSetId: queues.channelSetId,
              createdAt: queues.createdAt,
              id: queues.id,
              isDefault: queues.isDefault,
              name: queues.name,
              slots: queues.slots,
              timeZone: queues.timeZone,
            })
            .from(queues)
            .where(eq(queues.workspaceId, workspaceId))
            .orderBy(asc(queues.id))).map(dated),
          recyclingRules: (yield* db
            .select()
            .from(recyclingRules)
            .where(eq(recyclingRules.workspaceId, workspaceId))
            .orderBy(asc(recyclingRules.id))).map((rule) => ({
            anchorAt: DateTime.fromDateUnsafe(rule.anchorAt),
            count: rule.count,
            createdAt: DateTime.fromDateUnsafe(rule.createdAt),
            endedReason: rule.endedReason,
            id: rule.id,
            interval: rule.interval,
            lastDueAt: DateTime.fromDateUnsafe(rule.lastDueAt),
            made: rule.made,
            nextDueAt: utcOrNull(rule.nextDueAt),
            queueId: rule.queueId,
            sourcePostId: rule.sourcePostId,
            status: rule.status,
            timeZone: rule.timeZone,
            until: rule.until,
            variants: rule.variants,
          })),
          signatures: (yield* db
            .select({
              createdAt: signatures.createdAt,
              id: signatures.id,
              isDefault: signatures.isDefault,
              name: signatures.name,
              scope: signatures.scope,
              scopeChannelId: signatures.scopeChannelId,
              scopePlatform: signatures.scopePlatform,
              text: signatures.text,
            })
            .from(signatures)
            .where(eq(signatures.workspaceId, workspaceId))
            .orderBy(asc(signatures.id))).map(dated),
          tags: (yield* db
            .select({
              colour: tags.colour,
              createdAt: tags.createdAt,
              id: tags.id,
              name: tags.name,
            })
            .from(tags)
            .where(eq(tags.workspaceId, workspaceId))
            .orderBy(asc(tags.id))).map(dated),
        };

        return saved;
      },
      Effect.mapError(failed)
    );

    const deleteAll = Effect.fn("WorkspacePostStore.deleteAll")(
      function* deleteAll(workspaceId: string) {
        // The rules that repeat its posts first, under their rows' locks,
        // which a run making an occurrence takes before any post's; then
        // the feeds that make them, with what they read.
        yield* db
          .delete(recyclingRules)
          .where(eq(recyclingRules.workspaceId, workspaceId))
          .pipe(Effect.mapError(failed));

        yield* db
          .delete(feeds)
          .where(eq(feeds.workspaceId, workspaceId))
          .pipe(Effect.mapError(failed));

        // And what its members had read for it this past day.
        yield* db
          .delete(feedReads)
          .where(eq(feedReads.workspaceId, workspaceId))
          .pipe(Effect.mapError(failed));

        yield* db
          .delete(posts)
          .where(eq(posts.workspaceId, workspaceId))
          .pipe(Effect.mapError(failed));

        // And the keys of the requests that made them.
        yield* db
          .delete(idempotencyKeys)
          .where(eq(idempotencyKeys.workspaceId, workspaceId))
          .pipe(Effect.mapError(failed));

        // And the tags they were filed under.
        yield* db
          .delete(tags)
          .where(eq(tags.workspaceId, workspaceId))
          .pipe(Effect.mapError(failed));

        // And what the workspace saved to write them: its signatures, its
        // channel sets, its channels' default options and its queues.
        yield* db
          .delete(signatures)
          .where(eq(signatures.workspaceId, workspaceId))
          .pipe(Effect.mapError(failed));

        yield* db
          .delete(channelSets)
          .where(eq(channelSets.workspaceId, workspaceId))
          .pipe(Effect.mapError(failed));

        yield* db
          .delete(channelDefaults)
          .where(eq(channelDefaults.workspaceId, workspaceId))
          .pipe(Effect.mapError(failed));

        yield* db
          .delete(queues)
          .where(eq(queues.workspaceId, workspaceId))
          .pipe(Effect.mapError(failed));
      }
    );

    const lockRounds = Effect.fn("WorkspacePostStore.lockRounds")(
      function* lockRounds(workspaceId: string) {
        // FOR UPDATE waits for a call that is writing its journal row,
        // which holds the target's key, and then sees the row.
        const targets = yield* db
          .select({ round: postTargets.round, targetId: postTargets.id })
          .from(postTargets)
          .innerJoin(posts, eq(posts.id, postTargets.postId))
          .where(
            and(
              eq(posts.workspaceId, workspaceId),
              eq(posts.status, "publishing")
            )
          )
          .orderBy(asc(postTargets.id))
          .for("update", { of: postTargets })
          .pipe(Effect.mapError(failed));

        if (targets.length === 0) {
          return [];
        }

        const begun = yield* db
          .selectDistinct({ targetId: publicationCalls.targetId })
          .from(publicationCalls)
          .where(
            and(
              inArray(
                publicationCalls.targetId,
                targets.map(({ targetId }) => targetId)
              ),
              isNull(publicationCalls.finishedAt)
            )
          )
          .pipe(Effect.mapError(failed));

        const inFlight = new Set(begun.map(({ targetId }) => targetId));

        return yield* Effect.all(
          targets.map((target) =>
            decodeRound({
              ...target,
              inFlight: inFlight.has(target.targetId),
            }).pipe(Effect.orDie)
          )
        );
      }
    );

    return WorkspacePostStore.of({
      clearAuthor,
      deleteAll,
      exportAll,
      exportAuthored,
      exportSaved,
      lockAll,
      lockRounds,
    });
  })
);
