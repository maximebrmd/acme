import { and, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { DateTime, Effect, Layer, Option, Schema } from "effect";

import { ArticleJournal } from "#publishing/application/article-journal.ts";
import type { ArticleCallStart } from "#publishing/application/article-journal.ts";
import { ArticleStore } from "#publishing/application/article-store.ts";
import { ArticleBodySchema } from "#publishing/domain/article-body.ts";
import {
  ArticleContent,
  SiteStatusSchema,
} from "#publishing/domain/article-content.ts";
import { ArticleIdSchema } from "#publishing/domain/article-id.ts";
import {
  Article,
  ArticleStateSchema,
  articleMediaOf,
} from "#publishing/domain/article.ts";
import {
  AttemptOutcomeSchema,
  earlierRefusalsOf,
} from "#publishing/domain/publication-policy.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import {
  ChannelIdSchema,
  MediaAssetIdSchema,
  UserIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import type { MediaAssetId, WorkspaceId } from "#shared/domain/ids.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { articleCalls, articleFiles, articles } from "./schema.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

const date = (instant: DateTime.Utc) => DateTime.toDateUtc(instant);

const utc = (value: Date) => DateTime.fromDateUnsafe(value);

const StateJson = Schema.toCodecJson(ArticleStateSchema);

const BodyJson = Schema.toCodecJson(ArticleBodySchema);

const NamesJson = Schema.Array(Schema.String);

const OutcomeJson = Schema.toCodecJson(AttemptOutcomeSchema);

const RowSchema = Schema.Struct({
  authorId: Schema.NullOr(UserIdSchema),
  body: BodyJson,
  categories: NamesJson,
  channelId: ChannelIdSchema,
  coverMediaId: Schema.NullOr(MediaAssetIdSchema),
  excerpt: Schema.NullOr(Schema.String),
  id: ArticleIdSchema,
  siteStatus: SiteStatusSchema,
  state: StateJson,
  tags: NamesJson,
  title: Schema.String,
  workspaceId: WorkspaceIdSchema,
});

const decodeRow = Schema.decodeUnknownEffect(RowSchema);

const encodeState = Schema.encodeEffect(StateJson);

const encodeBody = Schema.encodeEffect(BodyJson);

const encodeOutcome = Schema.encodeEffect(OutcomeJson);

const decodeOutcome = Schema.decodeUnknownEffect(OutcomeJson);

const decodeMediaId = Schema.decodeUnknownEffect(MediaAssetIdSchema);

type Row = typeof articles.$inferSelect;

// A row the store wrote: one it cannot read is a bug.
const articleOf = (row: Row) =>
  decodeRow(row).pipe(
    Effect.map(
      (decoded) =>
        new Article({
          authorId: Option.fromNullOr(decoded.authorId),
          channelId: decoded.channelId,
          content: new ArticleContent({
            body: decoded.body,
            categories: decoded.categories,
            coverMediaId: Option.fromNullOr(decoded.coverMediaId),
            excerpt: Option.fromNullOr(decoded.excerpt),
            siteStatus: decoded.siteStatus,
            tags: decoded.tags,
            title: decoded.title,
          }),
          createdAt: utc(row.createdAt),
          id: decoded.id,
          revision: row.revision,
          round: row.round,
          state: decoded.state,
          updatedAt: utc(row.updatedAt),
          workspaceId: decoded.workspaceId,
        })
    ),
    Effect.orDie
  );

const rowOf = Effect.fnUntraced(function* rowOf(article: Article) {
  const { content, state } = article;
  const schedule = state._tag === "draft" ? undefined : state.schedule;

  return {
    authorId: Option.getOrNull(article.authorId),
    body: yield* encodeBody(content.body).pipe(Effect.orDie),
    categories: content.categories,
    channelId: article.channelId,
    coverMediaId: Option.getOrNull(content.coverMediaId),
    createdAt: date(article.createdAt),
    excerpt: Option.getOrNull(content.excerpt),
    id: article.id,
    mediaIds: [...new Set(articleMediaOf(content))],
    revision: article.revision,
    round: article.round,
    scheduleZone: schedule?.timeZone ?? null,
    scheduledAt: schedule === undefined ? null : date(schedule.at),
    siteStatus: content.siteStatus,
    state: yield* encodeState(state).pipe(Effect.orDie),
    status: state._tag,
    tags: content.tags,
    title: content.title,
    updatedAt: date(article.updatedAt),
    workspaceId: article.workspaceId,
  };
});

// The one article the rows hold, if any.
const one = (rows: readonly Row[]) =>
  rows[0] === undefined
    ? Effect.succeed(Option.none<Article>())
    : articleOf(rows[0]).pipe(Effect.map(Option.some));

// The workspace's articles that show the file.
const showingMedia = (workspaceId: WorkspaceId, mediaId: MediaAssetId) =>
  and(
    eq(articles.workspaceId, workspaceId),
    sql`${articles.mediaIds} @> ARRAY[${mediaId}]::uuid[]`
  );

/** ArticleStore on `publishing.articles`. */
export const DrizzleArticleStore = Layer.effect(
  ArticleStore,
  Effect.gen(function* DrizzleArticleStore() {
    const db = yield* Drizzle;

    return ArticleStore.of({
      ofWorkspace: (workspaceId, articleId) =>
        db
          .select()
          .from(articles)
          .where(
            and(
              eq(articles.workspaceId, workspaceId),
              eq(articles.id, articleId)
            )
          )
          .pipe(Effect.mapError(failed), Effect.flatMap(one)),
      get: (articleId) =>
        db
          .select()
          .from(articles)
          .where(eq(articles.id, articleId))
          .pipe(Effect.mapError(failed), Effect.flatMap(one)),
      insert: Effect.fn("ArticleStore.insert")(function* insert(article) {
        yield* db
          .insert(articles)
          .values(yield* rowOf(article))
          .pipe(Effect.mapError(failed));
      }),
      lock: (articleId) =>
        db
          .select()
          .from(articles)
          .where(eq(articles.id, articleId))
          .for("update")
          .pipe(Effect.mapError(failed), Effect.flatMap(one)),
      page: Effect.fn("ArticleStore.page")(function* page(request) {
        const rows = yield* db
          .select()
          .from(articles)
          .where(
            and(
              eq(articles.workspaceId, request.workspaceId),
              request.status.pipe(
                Option.map((status) => eq(articles.status, status)),
                Option.getOrUndefined
              ),
              request.before.pipe(
                Option.map((before) => lt(articles.id, before)),
                Option.getOrUndefined
              )
            )
          )
          .orderBy(desc(articles.id))
          .limit(request.limit + 1)
          .pipe(Effect.mapError(failed));

        const items = yield* Effect.forEach(
          rows.slice(0, request.limit),
          (row: Row) => articleOf(row)
        );

        return {
          items,
          next:
            rows.length > request.limit
              ? Option.fromUndefinedOr(items.at(-1)?.id)
              : Option.none(),
        };
      }),
      forgetAuthor: (userId) =>
        db
          .update(articles)
          .set({ authorId: null })
          .where(eq(articles.authorId, userId))
          .pipe(Effect.mapError(failed), Effect.asVoid),
      lockWorkspace: (workspaceId) =>
        db
          .select()
          .from(articles)
          .where(eq(articles.workspaceId, workspaceId))
          .for("update")
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap(Effect.forEach((row: Row) => articleOf(row)))
          ),
      removeWorkspace: (workspaceId) =>
        db
          .delete(articles)
          .where(eq(articles.workspaceId, workspaceId))
          .pipe(Effect.mapError(failed), Effect.asVoid),
      // What the articles settled with, and what their calls answered
      // before they settled.
      recordedOn: Effect.fn("ArticleStore.recordedOn")(
        function* recordedOn(channelId, platformPostIds) {
          if (platformPostIds.length === 0) {
            return new Set<string>();
          }

          const wanted = [...platformPostIds];
          const settledId = sql<string>`${articles.state}->>'platformPostId'`;
          const answeredId = sql<string>`${articleCalls.outcome}->>'platformPostId'`;

          const settledRows = yield* db
            .select({ id: settledId })
            .from(articles)
            .where(
              and(eq(articles.channelId, channelId), inArray(settledId, wanted))
            )
            .pipe(Effect.mapError(failed));

          const answeredRows = yield* db
            .select({ id: answeredId })
            .from(articleCalls)
            .innerJoin(articles, eq(articles.id, articleCalls.articleId))
            .where(
              and(
                eq(articles.channelId, channelId),
                inArray(answeredId, wanted)
              )
            )
            .pipe(Effect.mapError(failed));

          return new Set([...settledRows, ...answeredRows].map(({ id }) => id));
        }
      ),
      remove: (workspaceId, articleId) =>
        db
          .delete(articles)
          .where(
            and(
              eq(articles.workspaceId, workspaceId),
              eq(articles.id, articleId)
            )
          )
          .returning({ id: articles.id })
          .pipe(
            Effect.mapError(failed),
            Effect.map((rows) => rows.length > 0)
          ),
      lockShowing: (workspaceId, mediaId) =>
        db
          .select()
          .from(articles)
          .where(showingMedia(workspaceId, mediaId))
          .for("update")
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap(Effect.forEach((row: Row) => articleOf(row)))
          ),
      showing: (workspaceId, mediaId) =>
        db
          .select()
          .from(articles)
          .where(showingMedia(workspaceId, mediaId))
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap(Effect.forEach((row: Row) => articleOf(row)))
          ),
      update: Effect.fn("ArticleStore.update")(function* update(article, from) {
        const {
          createdAt: _created,
          id,
          workspaceId,
          ...changed
        } = yield* rowOf(article);

        // Only over the article as it was read: its state, revision and
        // round.
        const rows = yield* db
          .update(articles)
          .set(changed)
          .where(
            and(
              eq(articles.id, id),
              eq(articles.workspaceId, workspaceId),
              eq(articles.status, from.state._tag),
              eq(articles.revision, from.revision),
              eq(articles.round, from.round)
            )
          )
          .returning({ id: articles.id })
          .pipe(Effect.mapError(failed));

        return rows.length > 0;
      }),
    });
  })
);

type CallRow = typeof articleCalls.$inferSelect;

const callStartOf = (row: CallRow) =>
  Effect.gen(function* decodingCall() {
    const startedAt = utc(row.startedAt);

    if (
      (row.finishedAt === null || row.outcome === null) &&
      row.committedAt === null
    ) {
      const prepared: ArticleCallStart = { _tag: "prepared", startedAt };

      return prepared;
    }

    if (row.finishedAt === null || row.outcome === null) {
      const inFlight: ArticleCallStart = {
        _tag: "inFlight",
        committedAt: utc(row.committedAt ?? row.startedAt),
        startedAt,
      };

      return inFlight;
    }

    const completed: ArticleCallStart = {
      _tag: "completed",
      finishedAt: utc(row.finishedAt),
      outcome: yield* decodeOutcome(row.outcome).pipe(Effect.orDie),
      startedAt,
    };

    return completed;
  });

/** ArticleJournal on `publishing.article_calls`. */
export const DrizzleArticleJournal = Layer.effect(
  ArticleJournal,
  Effect.gen(function* DrizzleArticleJournal() {
    const db = yield* Drizzle;

    return ArticleJournal.of({
      begin: Effect.fn("ArticleJournal.begin")(function* begin(call) {
        const inserted = yield* db
          .insert(articleCalls)
          .values({
            articleId: call.articleId,
            attempt: call.attempt,
            idempotencyKey: call.idempotencyKey,
            round: call.round,
            startedAt: date(call.startedAt),
          })
          .onConflictDoNothing()
          .returning({ key: articleCalls.idempotencyKey })
          .pipe(Effect.mapError(failed));

        if (inserted.length === 1) {
          const started: ArticleCallStart = { _tag: "started" };

          return started;
        }

        // Some run began this attempt of the round: its call stands.
        const [row] = yield* db
          .select()
          .from(articleCalls)
          .where(
            and(
              eq(articleCalls.articleId, call.articleId),
              eq(articleCalls.round, call.round),
              eq(articleCalls.attempt, call.attempt)
            )
          )
          .pipe(Effect.mapError(failed));

        return row === undefined
          ? yield* Effect.die("A journal row vanished after a conflict")
          : yield* callStartOf(row);
      }),
      committing: (idempotencyKey, at) =>
        db
          .update(articleCalls)
          .set({ committedAt: date(at) })
          .where(eq(articleCalls.idempotencyKey, idempotencyKey))
          .pipe(Effect.mapError(failed), Effect.asVoid),
      fileSent: (articleId, mediaId, file) =>
        db
          .insert(articleFiles)
          .values({
            articleId,
            mediaId,
            siteMediaId: file.id,
            sourceUrl: file.sourceUrl,
          })
          .onConflictDoUpdate({
            set: { siteMediaId: file.id, sourceUrl: file.sourceUrl },
            target: [articleFiles.articleId, articleFiles.mediaId],
          })
          .pipe(Effect.mapError(failed), Effect.asVoid),
      filesSent: (articleId) =>
        db
          .select()
          .from(articleFiles)
          .where(eq(articleFiles.articleId, articleId))
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap(
              Effect.forEach((row) =>
                decodeMediaId(row.mediaId).pipe(
                  Effect.orDie,
                  Effect.map(
                    (mediaId) =>
                      [
                        mediaId,
                        { id: row.siteMediaId, sourceUrl: row.sourceUrl },
                      ] as const
                  )
                )
              )
            ),
            Effect.map((entries) => new Map(entries))
          ),
      earlierRefusals: (call) =>
        db
          .select({ outcome: articleCalls.outcome })
          .from(articleCalls)
          .where(
            and(
              eq(articleCalls.articleId, call.articleId),
              eq(articleCalls.round, call.round),
              lt(articleCalls.attempt, call.attempt)
            )
          )
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap(
              Effect.forEach(({ outcome }) =>
                outcome === null
                  ? Effect.succeedNone
                  : decodeOutcome(outcome).pipe(
                      Effect.orDie,
                      Effect.map(Option.some)
                    )
              )
            ),
            Effect.map((outcomes) =>
              earlierRefusalsOf(outcomes.flatMap(Option.toArray))
            )
          ),
      finish: Effect.fn("ArticleJournal.finish")(
        function* finish(idempotencyKey, outcome, finishedAt) {
          const encoded = yield* encodeOutcome(outcome).pipe(Effect.orDie);

          // The first run to finish a call writes how it ended.
          yield* db
            .update(articleCalls)
            .set({ finishedAt: date(finishedAt), outcome: encoded })
            .where(
              and(
                eq(articleCalls.idempotencyKey, idempotencyKey),
                isNull(articleCalls.finishedAt)
              )
            )
            .pipe(Effect.mapError(failed));
        }
      ),
      inFlight: (articleIds) =>
        articleIds.length === 0
          ? Effect.succeed(false)
          : db
              .select({ key: articleCalls.idempotencyKey })
              .from(articleCalls)
              .where(
                and(
                  inArray(articleCalls.articleId, [...articleIds]),
                  isNull(articleCalls.finishedAt)
                )
              )
              .limit(1)
              .pipe(
                Effect.mapError(failed),
                Effect.map((rows) => rows.length > 0)
              ),
    });
  })
);
