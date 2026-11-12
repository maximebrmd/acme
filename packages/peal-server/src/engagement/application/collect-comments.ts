import {
  Array as Arr,
  Context,
  DateTime,
  Duration,
  Effect,
  Layer,
  Metric,
  Option,
} from "effect";

import { defaultWindow } from "#engagement/domain/collection-schedule.ts";
import { CommentIdSchema } from "#engagement/domain/comment-id.ts";
import {
  forgetComment,
  isOnPlatform,
  markAnswered,
  receiveComment,
  refreshComment,
  storableReading,
} from "#engagement/domain/comment.ts";
import type { Comment, CommentReading } from "#engagement/domain/comment.ts";
import { ThreadIdSchema } from "#engagement/domain/thread-id.ts";
import {
  endCollection,
  followPost,
  postponeCollection,
  recordCollection,
} from "#engagement/domain/thread.ts";
import type {
  CollectionEnd,
  FollowedPost,
  Thread,
} from "#engagement/domain/thread.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { Ids, newId } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";

import { CommentSource, threadsPerRead } from "./ports/comment-source.ts";
import type { ThreadReading } from "./ports/comment-source.ts";
import { EngagementOutcomes } from "./ports/engagement-outcomes.ts";
import { EngagementStore } from "./ports/engagement-store.ts";
import type { DueChannel, LatestFollowed } from "./ports/engagement-store.ts";
import { FollowedPosts } from "./ports/followed-posts.ts";
import type { FollowCursor } from "./ports/followed-posts.ts";

/** What a run of the collection did. */
export interface CommentsReport {
  /** Posts that went live since the last run, now followed. */
  readonly discovered: number;
  /** Threads whose comments were read. */
  readonly read: number;
  /** Comments read for the first time. */
  readonly received: number;
  /** Threads put off: their platform down or slowing, their channel off. */
  readonly postponed: number;
  /**
   * Threads whose read could not be kept (the database refused it, or a
   * fault broke on it), put off like the others so the run goes on.
   */
  readonly failed: number;
  /** Threads read no more: out of the window, gone, or their channel gone. */
  readonly ended: number;
  /** Threads still due when the run stopped, which the next run takes. */
  readonly left: number;
}

/** How a run of the collection is paced. */
export interface CommentsPace {
  /** How long after its scheduled time a run starts no more reads. */
  readonly budget: Duration.Duration;
  /** Channels read at the same time, each one call at a time. */
  readonly channelConcurrency: number;
  /** Channels with threads due taken from the store at a time. */
  readonly channelsPerPage: number;
  /** The most threads of one channel a run reads. */
  readonly threadsPerChannel: number;
  /** How long after it went live a post's comments are read. */
  readonly window: Duration.Duration;
}

/**
 * The pace of the collection: 8 channels at a time, 30 threads a channel,
 * for 8 of the 10 minutes between two runs, on posts that went live in the
 * last 30 days. The server sets the concurrency and the window from
 * `PEAL_ENGAGEMENT_CONCURRENCY` and `PEAL_ENGAGEMENT_WINDOW_DAYS`.
 */
export const CommentsPaceRef = Context.Reference<CommentsPace>(
  "peal-server/engagement/application/CommentsPace",
  {
    defaultValue: () => ({
      budget: Duration.minutes(8),
      channelConcurrency: 8,
      channelsPerPage: 200,
      threadsPerChannel: 30,
      window: defaultWindow,
    }),
  }
);

/** How long the last comments collection run took, in seconds. */
export const collectionDuration = Metric.gauge(
  "peal.engagement.collection.duration",
  { description: "How long the last comments collection run took, in seconds" }
);

/**
 * The threads the last collection run left due: 0 while runs finish.
 * Above 0 run after run, comments are read later than their schedule says.
 */
export const collectionLeft = Metric.gauge("peal.engagement.collection.left", {
  description: "Threads still due when the last comments collection run ended",
});

/** Collection runs that stopped at their budget with threads still due. */
export const collectionsUnfinished = Metric.counter(
  "peal.engagement.collection.unfinished",
  {
    description:
      "Comments collection runs that could not finish in their budget",
    incremental: true,
  }
);

/**
 * Threads whose read could not be kept, each time one is put off for it.
 * One that keeps failing counts at every try: an alert watches it.
 */
export const threadsFailed = Metric.counter(
  "peal.engagement.collection.thread_failures",
  {
    description: "Threads whose comments could not be kept by a collection run",
    incremental: true,
  }
);

/** Comments read for the first time. */
export const commentsReceived = Metric.counter(
  "peal.engagement.comments.received",
  { description: "Comments read for the first time", incremental: true }
);

// A post publishing settles in a transaction that may commit a little
// after the instant it records: each run looks again this far back, and
// threads already followed stay as they are.
const discoveryOverlap = Duration.minutes(15);

const discoveryPage = 500;

// A run follows at most this many pages forward, and as many looking back.
const discoveryPages = 10;

type Tally = Omit<CommentsReport, "discovered" | "left">;

const emptyTally: Tally = {
  ended: 0,
  failed: 0,
  postponed: 0,
  read: 0,
  received: 0,
};

const addTallies = (left: Tally, right: Tally): Tally => ({
  ended: left.ended + right.ended,
  failed: left.failed + right.failed,
  postponed: left.postponed + right.postponed,
  read: left.read + right.read,
  received: left.received + right.received,
});

const isBefore = (
  post: Pick<FollowedPost, "publishedAt" | "targetId">,
  other: LatestFollowed
): boolean =>
  DateTime.isLessThan(post.publishedAt, other.publishedAt) ||
  (DateTime.Equivalence(post.publishedAt, other.publishedAt) &&
    post.targetId < other.targetId);

// How many of the comments read Peal does not keep yet: as many ids are
// issued for them.
const unknownIn = (
  kept: readonly Comment[],
  read: readonly CommentReading[]
): number => {
  const known = new Set(kept.map((comment) => comment.platformCommentId));

  const unknown = new Set<string>();

  for (const reading of read.flatMap((raw) =>
    Option.toArray(storableReading(raw))
  )) {
    if (!reading.fromAccount && !known.has(reading.platformCommentId)) {
      unknown.add(reading.platformCommentId);
    }
  }

  return unknown.size;
};

/** The comments a read found under a post, and whether they are all of them. */
export interface CommentsRead {
  readonly comments: readonly CommentReading[];
  readonly complete: boolean;
}

/** What a read changes in the comments Peal keeps. */
export interface Reconciled {
  /** Comments to save: new, or different from what Peal kept. */
  readonly changed: readonly Comment[];
  /** Those read for the first time and waiting for an answer. */
  readonly received: readonly Comment[];
}

/**
 * What a complete or partial read of a thread changes in the comments Peal
 * keeps of it: those read for the first time, those whose text, author or
 * standing moved, those answered by the account on the platform, and,
 * after a complete read, those the platform no longer shows.
 */
export const reconcile = (
  thread: Thread,
  kept: readonly Comment[],
  given: CommentsRead,
  ids: readonly Comment["id"][],
  now: DateTime.Utc
): Reconciled => {
  // Cleaned before anything is compared: ids are matched as they are kept.
  const read = {
    comments: given.comments.flatMap((reading) =>
      Option.toArray(storableReading(reading))
    ),
    complete: given.complete,
  };

  const byPlatformId = new Map(
    kept.map((comment) => [comment.platformCommentId, comment])
  );

  const seen = new Set<string>();
  const answered = new Set<string>();
  const next = new Map<string, Comment>();
  const received: Comment[] = [];
  let issued = 0;

  for (const reading of read.comments) {
    if (reading.fromAccount) {
      if (Option.isSome(reading.parentPlatformId)) {
        answered.add(reading.parentPlatformId.value);
      }
    } else if (!seen.has(reading.platformCommentId)) {
      seen.add(reading.platformCommentId);

      const known = byPlatformId.get(reading.platformCommentId);
      const id = ids[issued];

      if (known !== undefined) {
        next.set(reading.platformCommentId, refreshComment(known, reading));
      } else if (id !== undefined) {
        issued += 1;

        const comment = receiveComment(id, thread, reading, now);

        next.set(reading.platformCommentId, comment);
        received.push(comment);
      }
    }
  }

  if (read.complete) {
    for (const comment of kept) {
      if (!seen.has(comment.platformCommentId) && isOnPlatform(comment)) {
        next.set(comment.platformCommentId, forgetComment(comment));
      }
    }
  }

  for (const platformId of answered) {
    const comment = next.get(platformId) ?? byPlatformId.get(platformId);

    if (comment !== undefined && comment.state === "new") {
      next.set(platformId, markAnswered(comment, now));
    }
  }

  const changed = [...next.values()].filter((comment) => {
    const before = byPlatformId.get(comment.platformCommentId);

    return (
      before === undefined ||
      before.state !== comment.state ||
      before.text !== comment.text ||
      before.liked !== comment.liked ||
      Option.getOrNull(before.permalink) !==
        Option.getOrNull(comment.permalink) ||
      JSON.stringify(before.author) !== JSON.stringify(comment.author)
    );
  });

  const receivedIds = new Set(received.map(({ id }) => id));

  return {
    changed,
    // A comment the account already answered or hid on the platform when
    // Peal first read it is kept, and announced to nobody.
    received: changed.filter(
      (comment) => receivedIds.has(comment.id) && comment.state === "new"
    ),
  };
};

/**
 * Reads the comments under published posts on their platforms, run every
 * ten minutes: it follows the posts that went live since the last run,
 * then reads the threads due, through each channel's gate. `at` is the
 * run's scheduled time, which the next reads are counted from.
 */
export class CollectComments extends Context.Service<
  CollectComments,
  {
    readonly run: (
      at: DateTime.Utc
    ) => Effect.Effect<CommentsReport, DatabaseError>;
  }
>()("peal-server/engagement/application/CollectComments") {
  static readonly layer = Layer.effect(
    CollectComments,
    Effect.gen(function* CollectCommentsLive() {
      const posts = yield* FollowedPosts;
      const store = yield* EngagementStore;
      const source = yield* CommentSource;
      const outcomes = yield* EngagementOutcomes;
      const pace = yield* CommentsPaceRef;
      const { transaction } = yield* TransactionRunner;
      const ids = yield* Ids;

      const issue = (count: number) =>
        Effect.all(Arr.makeBy(count, () => newId(CommentIdSchema))).pipe(
          Effect.provideService(Ids, ids)
        );

      const follow = Effect.fn("CollectComments.follow")(function* follow(
        from: FollowCursor,
        until: Option.Option<LatestFollowed>
      ) {
        let cursor = from;
        let discovered = 0;

        for (let page = 0; page < discoveryPages; page += 1) {
          const published = yield* posts.from(cursor, discoveryPage);

          const threads = yield* Effect.all(
            published.map((post) =>
              newId(ThreadIdSchema).pipe(
                Effect.map((id) => followPost(id, post))
              )
            )
          ).pipe(Effect.provideService(Ids, ids));

          discovered += yield* store.follow(threads);

          const last = published.at(-1);

          if (
            last === undefined ||
            published.length < discoveryPage ||
            Option.exists(until, (end) => !isBefore(last, end))
          ) {
            break;
          }

          cursor = {
            publishedAt: last.publishedAt,
            targetId: Option.some(last.targetId),
          };
        }

        return discovered;
      });

      // Follows the posts published since the latest one followed, then
      // those that settled late before it; for a first run, those still
      // in the window.
      const discover = Effect.fn("CollectComments.discover")(function* discover(
        at: DateTime.Utc
      ) {
        const found = yield* store.latestFollowed(at);

        if (Option.isNone(found)) {
          return yield* follow(
            {
              publishedAt: DateTime.subtractDuration(at, pace.window),
              targetId: Option.none(),
            },
            Option.none()
          );
        }

        const latest = found.value;

        const since = yield* follow(
          {
            publishedAt: latest.publishedAt,
            targetId: Option.some(latest.targetId),
          },
          Option.none()
        );

        const late = yield* follow(
          {
            publishedAt: DateTime.subtractDuration(
              latest.publishedAt,
              discoveryOverlap
            ),
            targetId: Option.none(),
          },
          found
        );

        return since + late;
      });

      const postponing = (threads: readonly Thread[], at: DateTime.Utc) =>
        store
          .saveCollections(
            threads.map((thread) => postponeCollection(thread, at, pace.window))
          )
          .pipe(Effect.as<Tally>({ ...emptyTally, postponed: threads.length }));

      const ending = (
        threads: readonly Thread[],
        reason: CollectionEnd,
        at: DateTime.Utc
      ) =>
        store
          .saveCollections(
            threads.map((thread) => endCollection(thread, reason, at))
          )
          .pipe(Effect.as<Tally>({ ...emptyTally, ended: threads.length }));

      // What a read found of one thread, saved with what it tells the
      // workspace, in one transaction.
      const record = Effect.fn("CollectComments.record")(function* record(
        thread: Thread,
        reading: ThreadReading,
        at: DateTime.Utc,
        refreshWithin: Option.Option<Duration.Duration>
      ) {
        if (reading._tag === "failed") {
          return yield* postponing([thread], at);
        }

        const now = yield* DateTime.now;

        // The platform no longer shows the post: its comments went with it.
        if (reading._tag === "missing") {
          return yield* transaction(
            Effect.gen(function* forgetting() {
              yield* store.lockThread(thread.id);

              const kept = yield* store.commentsOf(thread.id);

              yield* store.saveComments(
                kept.filter(isOnPlatform).map(forgetComment)
              );

              return yield* ending([thread], "missing", at);
            })
          );
        }

        // Read: a complete read starts its platform's bound again from
        // now; an incomplete one leaves it where it was.
        const read = recordCollection(
          thread,
          now,
          at,
          pace.window,
          refreshWithin,
          reading.complete
        );

        // The comments are read under the thread's lock, which a member's
        // action takes too: what reconcile writes is what it read.
        const { received } = yield* transaction(
          Effect.gen(function* saving() {
            yield* store.lockThread(thread.id);

            // The channel left while its comments were on their way (its
            // thread ended `disconnected` under the same lock): what the
            // read found is not kept.
            const current = yield* store.thread(thread.id);

            if (
              Option.match(current, {
                onNone: () => true,
                onSome: ({ thread: stored }) =>
                  stored.collection._tag === "ended" &&
                  stored.collection.reason === "disconnected",
              })
            ) {
              const dropped: Reconciled = { changed: [], received: [] };

              return dropped;
            }

            const kept = yield* store.commentsOf(thread.id);

            const reconciled = reconcile(
              thread,
              kept,
              reading,
              yield* issue(unknownIn(kept, reading.comments)),
              now
            );

            yield* store.saveComments(reconciled.changed);
            yield* store.saveCollections([read]);

            if (reconciled.received.length > 0) {
              yield* outcomes.received(read, reconciled.received);
            }

            return reconciled;
          })
        );

        yield* Metric.update(commentsReceived, received.length);

        const tally: Tally = {
          ended: read.collection._tag === "ended" ? 1 : 0,
          failed: 0,
          postponed: 0,
          read: 1,
          received: received.length,
        };

        return tally;
      });

      // One thread never stops a run. What a read found of it may be
      // something the database refuses, or break a fault of Peal's own:
      // the thread is then put off like one its platform could not show,
      // away from the queue's front, counted, and named by id alone in
      // the log, never with the failure itself, which may quote what
      // people wrote. When putting it off fails too, the database is
      // down, and the run stops as it would.
      const recordOrPutOff = (
        thread: Thread,
        reading: ThreadReading,
        at: DateTime.Utc,
        refreshWithin: Option.Option<Duration.Duration>
      ) => {
        const putOff = (kind: "database" | "fault") =>
          Effect.logWarning(
            "A thread's comments could not be kept: it is read again later, after the others"
          ).pipe(
            Effect.annotateLogs({ kind, threadId: thread.id }),
            Effect.andThen(Metric.update(threadsFailed, 1)),
            Effect.andThen(postponing([thread], at)),
            Effect.map((tally): Tally => ({
              ...tally,
              failed: 1,
              postponed: 0,
            }))
          );

        return record(thread, reading, at, refreshWithin).pipe(
          Effect.catchTag("DatabaseError", () => putOff("database")),
          Effect.catchDefect(() => putOff("fault"))
        );
      };

      // A channel's due threads, one call at a time, until the platform
      // asks to slow down, the channel cannot be read, or the run is out
      // of time: what is left then waits, away from the front of the queue.
      const collectChannel = Effect.fn("CollectComments.channel")(
        function* collectChannel(
          threads: Arr.NonEmptyReadonlyArray<Thread>,
          at: DateTime.Utc,
          deadline: DateTime.Utc
        ) {
          const { channelId } = Arr.headNonEmpty(threads);
          let total = emptyTally;
          let left = [...threads];

          while (left.length > 0) {
            if (
              DateTime.isGreaterThanOrEqualTo(yield* DateTime.now, deadline)
            ) {
              return total;
            }

            const batch = left.slice(0, threadsPerRead);

            left = left.slice(threadsPerRead);

            const outcome = yield* source
              .read({
                channelId,
                threads: batch.map(({ id, platformPostId }) => ({
                  platformPostId,
                  threadId: id,
                })),
              })
              .pipe(Effect.result);

            if (outcome._tag === "Failure") {
              const rest = [...batch, ...left];
              const { failure } = outcome;

              const tally =
                failure._tag === "PlatformUnavailable" ||
                failure.reason === "paused"
                  ? yield* postponing(rest, at)
                  : yield* ending(rest, failure.reason, at);

              return addTallies(total, tally);
            }

            const byId = new Map(batch.map((thread) => [thread.id, thread]));

            for (const reading of outcome.success.readings) {
              const thread = byId.get(reading.threadId);

              if (thread !== undefined) {
                byId.delete(reading.threadId);
                total = addTallies(
                  total,
                  yield* recordOrPutOff(
                    thread,
                    reading,
                    at,
                    Option.fromUndefinedOr(outcome.success.refreshWithin)
                  )
                );
              }
            }

            // Threads the read said nothing of: the platform asked to
            // slow down before their turn.
            total = addTallies(
              total,
              yield* postponing([...byId.values()], at)
            );

            if (outcome.success.halted) {
              return addTallies(total, yield* postponing(left, at));
            }
          }

          return total;
        }
      );

      // Reads the threads due, the channels that waited longest first and
      // each once, a page of channels at a time, until none is left or the
      // run is out of time.
      const collectDue = Effect.fn("CollectComments.due")(function* collectDue(
        at: DateTime.Utc,
        deadline: DateTime.Utc
      ) {
        let total = emptyTally;
        let after = Option.none<DueChannel>();

        while (true) {
          if (DateTime.isGreaterThanOrEqualTo(yield* DateTime.now, deadline)) {
            return { total, unfinished: true };
          }

          const channels = yield* store.dueChannels(
            at,
            pace.channelsPerPage,
            after
          );

          const due = Arr.groupBy(
            yield* store.dueOn(
              at,
              channels.map(({ channelId }) => channelId),
              pace.threadsPerChannel
            ),
            (thread) => thread.channelId
          );

          const tallies = yield* Effect.forEach(
            channels,
            ({ channelId }) => {
              const threads = due[channelId] ?? [];

              return Arr.isReadonlyArrayNonEmpty(threads)
                ? collectChannel(threads, at, deadline)
                : Effect.succeed(emptyTally);
            },
            { concurrency: pace.channelConcurrency }
          );

          for (const tally of tallies) {
            total = addTallies(total, tally);
          }

          after = Option.fromUndefinedOr(channels.at(-1));

          if (channels.length < pace.channelsPerPage) {
            return {
              total,
              unfinished: DateTime.isGreaterThanOrEqualTo(
                yield* DateTime.now,
                deadline
              ),
            };
          }
        }
      });

      const run = Effect.fn("CollectComments.run")(function* run(
        at: DateTime.Utc
      ) {
        const startedAt = yield* DateTime.now;
        const deadline = DateTime.addDuration(at, pace.budget);
        const discovered = yield* discover(at);
        const { total, unfinished } = yield* collectDue(at, deadline);
        const left = yield* store.countDue(at);
        const report: CommentsReport = { discovered, ...total, left };
        const took = DateTime.distance(startedAt, yield* DateTime.now);

        yield* Metric.update(collectionDuration, Duration.toSeconds(took));
        yield* Metric.update(collectionLeft, left);

        if (unfinished && left > 0) {
          yield* Metric.update(collectionsUnfinished, 1);
          yield* Effect.logWarning(
            "The comments collection could not finish before the next run: the threads left are read by the runs that follow, later than their schedule says. Raise PEAL_ENGAGEMENT_CONCURRENCY if platforms answer"
          ).pipe(
            Effect.annotateLogs({
              ...report,
              seconds: Duration.toSeconds(took),
            })
          );
        }

        return report;
      });

      return CollectComments.of({ run });
    })
  );
}
