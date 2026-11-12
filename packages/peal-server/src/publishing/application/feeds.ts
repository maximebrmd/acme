import {
  Context,
  DateTime,
  Duration,
  Effect,
  Layer,
  Option,
  Ref,
  Result,
} from "effect";

import type { ChannelSetId } from "#publishing/domain/channel-set-id.ts";
import type { FeedAddressRefused } from "#publishing/domain/feed-address-refused.ts";
import { FeedAddressRefused as AddressRefused } from "#publishing/domain/feed-address-refused.ts";
import { parseFeedAddress } from "#publishing/domain/feed-address.ts";
import type { FeedAddress } from "#publishing/domain/feed-address.ts";
import type { FeedDocument } from "#publishing/domain/feed-document.ts";
import type { FeedEntry } from "#publishing/domain/feed-entry.ts";
import { FeedIdSchema } from "#publishing/domain/feed-id.ts";
import type { FeedId } from "#publishing/domain/feed-id.ts";
import type { FeedItemReason } from "#publishing/domain/feed-item-outcome.ts";
import { distinctItems, newItems } from "#publishing/domain/feed-items.ts";
import type { FeedStopReason } from "#publishing/domain/feed-stop-reason.ts";
import type { FeedTemplateInvalid } from "#publishing/domain/feed-template-invalid.ts";
import {
  defaultTemplate,
  parseTemplate,
  writtenFrom,
  writtenTooLong,
} from "#publishing/domain/feed-template.ts";
import {
  adoptFeed,
  editFeed,
  isDue,
  leaseFeed,
  maxFeedsPerWorkspace,
  moveFeed,
  pauseFeed,
  readFailed,
  readSucceeded,
  resumeFeed,
  startFeed,
  stopFeed,
} from "#publishing/domain/feed.ts";
import type {
  Feed,
  FeedChange,
  FeedMode,
  FeedValidators,
} from "#publishing/domain/feed.ts";
import { MediaAttachment } from "#publishing/domain/media-attachment.ts";
import type { PostContentRejected } from "#publishing/domain/post-content-rejected.ts";
import { PostContent } from "#publishing/domain/post-content.ts";
import type { PostOrigin } from "#publishing/domain/post-origin.ts";
import type { QueueId } from "#publishing/domain/queue-id.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { newId } from "#shared/application/ids.ts";
import type { Ids } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { ChannelId, PostId } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";

import { ChannelSetNotFound } from "./channel-set-not-found.ts";
import { ChannelSetStore } from "./channel-set-store.ts";
import { FeedNotFound } from "./feed-not-found.ts";
import { FeedNotices } from "./feed-notices.ts";
import { FeedPictures } from "./feed-pictures.ts";
import type { FeedPicture } from "./feed-pictures.ts";
import type { FeedReadFailed } from "./feed-read-failed.ts";
import { FeedReadsLimited } from "./feed-reads-limited.ts";
import { FeedReads } from "./feed-reads.ts";
import { FeedSource } from "./feed-source.ts";
import type { FeedRead } from "./feed-source.ts";
import { FeedStore } from "./feed-store.ts";
import type { FeedItemRecord } from "./feed-store.ts";
import { FeedUnreadable } from "./feed-unreadable.ts";
import { queueNamed } from "./placement.ts";
import { PostDrafts } from "./post-drafts.ts";
import { PostOrigins } from "./post-origins.ts";
import { channelsFor } from "./post-references.ts";
import { PostScheduling } from "./post-scheduling.ts";
import type { QueueNotFound } from "./queue-not-found.ts";
import type { QueueStore } from "./queue-store.ts";
import { RecyclingActors } from "./recycling-actors.ts";
import type { SignatureNotFound } from "./signature-not-found.ts";
import { mayChangeStarted, notImpersonating, starterOf } from "./started-by.ts";
import { TooManyFeeds } from "./too-many-feeds.ts";
import type { UnknownChannels } from "./unknown-channels.ts";
import type { UnknownMedia } from "./unknown-media.ts";
import type { UnknownTags } from "./unknown-tags.ts";
import type { WorkspaceChannels } from "./workspace-channels.ts";

/** How many items of a feed its page shows. */
export const itemsShown = 50;

/** How many items a preview writes. */
export const previewedItems = 3;

/**
 * How many items each feed keeps: those a read listed last, and every one
 * its latest read listed.
 */
export const itemsKept = 500;

/**
 * How long a claimed item's send may be taken up again: within the
 * idempotency key's lifetime, which answers the post it made, less an
 * hour for a run late.
 */
export const claimLifetime = Duration.hours(23);

/** How many due feeds a run reads at once. */
export const feedConcurrency = 4;

/** How many due feeds a run lists at once. */
export const duePageSize = 100;

/**
 * How long after its scheduled time a run still starts reading a feed: it
 * stops before the next run starts.
 */
export const runBudget = Duration.minutes(8);

/**
 * How long a run holds a feed it reads: no other run reads it meanwhile,
 * and a run that died gives it back after this.
 */
export const readLease = Duration.minutes(10);

/** What starts a feed. */
export interface CreateFeedRequest {
  readonly attachPicture: boolean;
  readonly channelIds: readonly ChannelId[];
  readonly channelSetId: Option.Option<ChannelSetId>;
  readonly mode: FeedMode;
  readonly queueId: Option.Option<QueueId>;
  readonly template: Option.Option<string>;
  readonly url: string;
}

/** What a member changes of a feed: each left out stays as it is. */
export interface ChangeFeedRequest {
  readonly attachPicture?: boolean;
  readonly channelIds?: readonly ChannelId[];
  readonly channelSetId?: Option.Option<ChannelSetId>;
  readonly mode?: FeedMode;
  readonly queueId?: Option.Option<QueueId>;
  /** Pauses it, or sets a paused or stopped feed going again. */
  readonly status?: "active" | "paused";
  readonly template?: string;
  readonly url?: string;
}

/** A feed just started, and how many items it held, which it never makes. */
export interface CreatedFeed {
  readonly feed: Feed;
  readonly seen: number;
}

/** An item as the template would write it, in a preview. */
export interface PreviewedItem {
  readonly entry: FeedEntry;
  readonly text: Option.Option<string>;
}

/** What a preview read. */
export interface FeedPreview {
  readonly items: readonly PreviewedItem[];
  readonly title: Option.Option<string>;
}

/** What a run of the due feeds did. */
export interface FeedRun {
  /** Feeds read, whatever their read gave. */
  readonly read: number;
  /** Posts made: drafts, or posts on a queue. */
  readonly made: number;
  /** Feeds whose read failed. */
  readonly failed: number;
  /** Feeds stopped. */
  readonly stopped: number;
  /** Feeds still due when it ended. */
  readonly left: number;
  /** Whether it stopped at its budget with feeds still due. */
  readonly unfinished: boolean;
}

type Ports =
  | ChannelSetStore
  | Ids
  | PostOrigins
  | QueueStore
  | WorkspaceChannels;

type RequestFailure =
  | ChannelSetNotFound
  | DatabaseError
  | FeedAddressRefused
  | FeedReadsLimited
  | FeedTemplateInvalid
  | FeedUnreadable
  | MissingPermission
  | QueueNotFound
  | UnknownChannels;

const noValidators: FeedValidators = {
  etag: Option.none(),
  lastModified: Option.none(),
};

// What a read a member asked for tells them when it gave nothing.
const unreadable = (failed: FeedReadFailed) => {
  if (failed.failure === "refused") {
    return new AddressRefused({ reason: "notPublic" });
  }

  return new FeedUnreadable({
    reason:
      failed.failure === "notAFeed" || failed.failure === "tooLarge"
        ? failed.failure
        : "unreachable",
  });
};

// What is kept of every item a read gave, as seen and never made.
const existing = (
  document: FeedDocument,
  now: DateTime.Utc
): readonly FeedItemRecord[] =>
  distinctItems(document.items).map((entry) => ({
    digest: entry.digest,
    itemAt: entry.publishedAt,
    outcome: "skipped",
    pictureSkipped: Option.none(),
    postId: Option.none(),
    reason: Option.some("existing"),
    seenAt: now,
  }));

// A post's content: the text, and the item's picture when it was had,
// described by the item's title.
const contentOf = (text: string, picture: Option.Option<MediaAttachment>) =>
  new PostContent({ media: Option.toArray(picture), overrides: [], text });

// The newest items first: by date when each has one, else as listed.
const newestFirst = (items: readonly FeedEntry[]) =>
  items.every(({ publishedAt }) => Option.isSome(publishedAt))
    ? items.toSorted((left, right) =>
        DateTime.Order(
          Option.getOrThrow(right.publishedAt),
          Option.getOrThrow(left.publishedAt)
        )
      )
    : items;

/**
 * Feeds to posts: a workspace follows web feeds (RSS 2.0, Atom 1.0, JSON
 * Feed 1.1), and every item that appears in one after it was added
 * becomes a draft, or a post on a queue's next free slot, as its template
 * writes it (`#publishing/domain/feed.ts`).
 *
 * Reading feeds needs post:read; creating, changing, pausing, resuming and
 * deleting one needs post:create, with post:schedule too for a feed that
 * puts posts on a queue, never staff acting as a member. Those who hold
 * post:schedule change any feed; a starter without it changes their own,
 * through the same way in (`mayChangeStarted`). Each read of an address a
 * member gives (creating, moving, resuming, previewing) takes one of the
 * workspace's hourly reads (`FeedReads`).
 *
 * `poll` reads the feeds that are due, a few at once, each held by a
 * lease written under its row's lock (skipping one held), and makes their
 * new items as whoever started each feed is now (`RecyclingActors`).
 */
export class Feeds extends Context.Service<
  Feeds,
  {
    readonly list: (
      actor: Actor,
      after: Option.Option<FeedId>,
      limit: number
    ) => Effect.Effect<readonly Feed[], DatabaseError | MissingPermission>;
    readonly get: (
      actor: Actor,
      feedId: FeedId
    ) => Effect.Effect<Feed, DatabaseError | FeedNotFound | MissingPermission>;
    readonly items: (
      actor: Actor,
      feedId: FeedId
    ) => Effect.Effect<
      readonly FeedItemRecord[],
      DatabaseError | FeedNotFound | MissingPermission
    >;
    readonly create: (
      actor: Actor,
      request: CreateFeedRequest
    ) => Effect.Effect<CreatedFeed, RequestFailure | TooManyFeeds>;
    readonly change: (
      actor: Actor,
      feedId: FeedId,
      request: ChangeFeedRequest
    ) => Effect.Effect<Feed, FeedNotFound | RequestFailure>;
    /** Deletes the feed: the posts it made stay as they are. */
    readonly remove: (
      actor: Actor,
      feedId: FeedId
    ) => Effect.Effect<void, DatabaseError | FeedNotFound | MissingPermission>;
    /** Reads an address and writes its newest items: keeps nothing. */
    readonly preview: (
      actor: Actor,
      url: string,
      template: Option.Option<string>
    ) => Effect.Effect<
      FeedPreview,
      | DatabaseError
      | FeedAddressRefused
      | FeedReadsLimited
      | FeedTemplateInvalid
      | FeedUnreadable
      | MissingPermission
    >;
    /** Reads the feeds due at `at`, the run's scheduled time. */
    readonly poll: (at: DateTime.Utc) => Effect.Effect<FeedRun, DatabaseError>;
    /** How many active feeds were due before `before` and not read. */
    readonly overdue: (
      before: DateTime.Utc
    ) => Effect.Effect<number, DatabaseError>;
    /**
     * Deletes items past each feed's `itemsKept` newest, and the hourly
     * read counts a day old: says how many of each.
     */
    readonly prune: Effect.Effect<
      { readonly items: number; readonly reads: number },
      DatabaseError
    >;
  }
>()("peal-server/publishing/application/Feeds") {
  static readonly layer = Layer.effect(
    Feeds,
    Effect.gen(function* FeedsLive() {
      const store = yield* FeedStore;
      const source = yield* FeedSource;
      const budget = yield* FeedReads;
      const drafts = yield* PostDrafts;
      const scheduling = yield* PostScheduling;
      const actors = yield* RecyclingActors;
      const notices = yield* FeedNotices;
      const pictures = yield* FeedPictures;
      const { transaction } = yield* TransactionRunner;
      const ports = yield* Effect.context<Ports>();

      const withPorts = Effect.provideContext(ports);

      // Who may start a feed of this mode, as themselves.
      const mayStart = Effect.fn("Feeds.mayStart")(function* mayStart(
        actor: Actor,
        mode: FeedMode
      ) {
        yield* notImpersonating(actor);
        yield* Effect.fromResult(authorize(actor, "post:create"));

        if (mode === "queue") {
          yield* Effect.fromResult(authorize(actor, "post:schedule"));
        }
      });

      const found = Effect.fn("Feeds.found")(function* found(
        actor: Actor,
        feedId: FeedId
      ) {
        const feed = yield* store.byId(actor.workspaceId, feedId);

        if (Option.isNone(feed)) {
          return yield* new FeedNotFound({ feedId });
        }

        return feed.value;
      });

      // One of the workspace's reads of an address a member gave.
      const takeRead = Effect.fn("Feeds.takeRead")(function* takeRead(
        actor: Actor
      ) {
        const allowance = yield* budget.take(actor.workspaceId);

        if (allowance._tag === "refused") {
          yield* new FeedReadsLimited({
            retryAfterSeconds: Math.max(
              1,
              Math.ceil(Duration.toSeconds(allowance.retryAfter))
            ),
          });
        }
      });

      // The address read once for a member, as a feed: refused when it is
      // not one Peal reads, or not a feed.
      const readFor = Effect.fn("Feeds.readFor")(function* readFor(
        actor: Actor,
        url: FeedAddress
      ) {
        yield* takeRead(actor);

        const read = yield* source
          .read(url, noValidators)
          .pipe(Effect.mapError(unreadable));

        if (read._tag === "notModified") {
          return yield* new FeedUnreadable({ reason: "unreachable" });
        }

        return read;
      });

      // What a feed's posts go to, once they are the workspace's.
      const checkedTargets = Effect.fn("Feeds.checkedTargets")(
        function* checkedTargets(
          actor: Actor,
          targets: {
            readonly channelIds: readonly ChannelId[];
            readonly channelSetId: Option.Option<ChannelSetId>;
            readonly mode: FeedMode;
            readonly queueId: Option.Option<QueueId>;
          }
        ) {
          yield* channelsFor(actor, targets.channelIds);

          if (Option.isSome(targets.channelSetId)) {
            const setId = targets.channelSetId.value;

            const sets = yield* ChannelSetStore.use((saved) =>
              saved.list(actor.workspaceId)
            );

            if (!sets.some(({ id }) => id === setId)) {
              yield* new ChannelSetNotFound({ channelSet: setId });
            }
          }

          if (targets.mode === "queue") {
            yield* queueNamed(actor.workspaceId, targets.queueId);
          }
        },
        withPorts
      );

      const list = Effect.fn("Feeds.list")(function* list(
        actor: Actor,
        after: Option.Option<FeedId>,
        limit: number
      ) {
        yield* Effect.fromResult(authorize(actor, "post:read"));

        return yield* store.list(actor.workspaceId, after, limit);
      });

      const get = Effect.fn("Feeds.get")(function* get(
        actor: Actor,
        feedId: FeedId
      ) {
        yield* Effect.fromResult(authorize(actor, "post:read"));

        return yield* found(actor, feedId);
      });

      const items = Effect.fn("Feeds.items")(function* items(
        actor: Actor,
        feedId: FeedId
      ) {
        yield* Effect.fromResult(authorize(actor, "post:read"));

        const feed = yield* found(actor, feedId);

        return yield* store.items(feed.id, itemsShown);
      });

      const create = Effect.fn("Feeds.create")(function* create(
        actor: Actor,
        request: CreateFeedRequest
      ) {
        yield* mayStart(actor, request.mode);

        const url = yield* Effect.fromResult(parseFeedAddress(request.url));

        const template = yield* Effect.fromResult(
          parseTemplate(
            Option.getOrElse(request.template, () => defaultTemplate)
          )
        );

        yield* checkedTargets(actor, request);

        if ((yield* store.count(actor.workspaceId)) >= maxFeedsPerWorkspace) {
          return yield* new TooManyFeeds({ allowed: maxFeedsPerWorkspace });
        }

        const read = yield* readFor(actor, url);
        const id = yield* newId(FeedIdSchema).pipe(withPorts);

        const via = yield* PostOrigins.use((origins) => origins.of(actor)).pipe(
          withPorts
        );

        return yield* transaction(
          Effect.gen(function* add() {
            yield* store.claim(actor.workspaceId);

            if (
              (yield* store.count(actor.workspaceId)) >= maxFeedsPerWorkspace
            ) {
              return yield* new TooManyFeeds({ allowed: maxFeedsPerWorkspace });
            }

            const now = yield* DateTime.now;

            const feed = startFeed(
              {
                attachPicture: request.attachPicture,
                channelIds: request.channelIds,
                channelSetId: request.channelSetId,
                id,
                mode: request.mode,
                queueId: request.queueId,
                startedBy: starterOf(actor),
                startedVia: via,
                template,
                title: read.document.title,
                url,
                validators: read.validators,
                workspaceId: actor.workspaceId,
              },
              now
            );

            yield* store.insert(feed);

            const seen = yield* store.record(
              feed.id,
              existing(read.document, now)
            );

            yield* store.listed(
              feed.id,
              read.document.items.map(({ digest }) => digest),
              now
            );

            const created: CreatedFeed = { feed, seen: seen.size };

            return created;
          })
        );
      });

      const change = Effect.fn("Feeds.change")(function* change(
        actor: Actor,
        feedId: FeedId,
        request: ChangeFeedRequest
      ) {
        const current = yield* found(actor, feedId);
        const mode = request.mode ?? current.mode;

        yield* mayChangeStarted(actor, current, mayStart(actor, mode));
        // A feed that is, or becomes, one that queues posts needs
        // post:schedule of whoever changes it.
        yield* mayStart(actor, mode);

        const url = yield* Option.match(Option.fromUndefinedOr(request.url), {
          onNone: () => Effect.succeed(Option.none<FeedAddress>()),
          onSome: (given) =>
            Effect.fromResult(parseFeedAddress(given)).pipe(
              Effect.map((parsed) =>
                parsed === current.url ? Option.none() : Option.some(parsed)
              )
            ),
        });

        const template =
          request.template === undefined
            ? undefined
            : yield* Effect.fromResult(parseTemplate(request.template));

        const edit: FeedChange = {
          attachPicture: request.attachPicture,
          channelIds: request.channelIds,
          channelSetId: request.channelSetId,
          mode: request.mode,
          queueId: request.queueId,
          template,
        };

        const edited = editFeed(current, edit, current.updatedAt);

        const resuming =
          request.status === "active" && current.status._tag !== "active";

        // Where its posts go is checked when it changes, or when the feed
        // goes again: pausing one whose channel or queue is gone is never
        // refused, and resuming it names what to put right (the channels,
        // UnknownChannels; the queue, QueueNotFound).
        const targetsChange =
          request.channelIds !== undefined ||
          request.channelSetId !== undefined ||
          request.mode !== undefined ||
          request.queueId !== undefined;

        if (targetsChange || resuming) {
          yield* checkedTargets(actor, edited);
        }

        // A feed whose starter is gone is taken over by whoever resumes
        // it, as one they add would be: their posts, as they reach Peal.
        const takeOver =
          resuming &&
          current.status._tag === "stopped" &&
          current.status.reason === "starterGone";

        const via = takeOver
          ? Option.some(
              yield* PostOrigins.use((origins) => origins.of(actor)).pipe(
                withPorts
              )
            )
          : Option.none<PostOrigin>();

        // A new address, or a feed set going again, is read at once: what
        // it holds then is never made.
        const read =
          Option.isSome(url) || resuming
            ? Option.some(
                yield* readFor(
                  actor,
                  Option.getOrElse(url, () => current.url)
                )
              )
            : Option.none<Extract<FeedRead, { readonly _tag: "read" }>>();

        return yield* transaction(
          Effect.gen(function* save() {
            const locked = yield* store.lock(actor.workspaceId, feedId);

            if (Option.isNone(locked)) {
              return yield* new FeedNotFound({ feedId });
            }

            const now = yield* DateTime.now;

            let feed = editFeed(locked.value, edit, now);

            if (Option.isSome(read)) {
              const { document, validators } = read.value;
              const seenRead = { title: document.title, validators };

              feed = Option.isSome(url)
                ? moveFeed(feed, url.value, now, seenRead)
                : feed;

              // A paused feed moved stays paused; one resumed goes again.
              feed = resuming ? resumeFeed(feed, now, seenRead) : feed;

              feed = Option.match(via, {
                onNone: () => feed,
                onSome: (origin) => adoptFeed(feed, starterOf(actor), origin),
              });

              yield* store.record(feed.id, existing(document, now));

              // Going again, or at a new address, makes nothing it held:
              // a send a run before left unsettled is never taken up.
              yield* store.abandonClaims(feed.id);
              yield* store.listed(
                feed.id,
                document.items.map(({ digest }) => digest),
                now
              );
            }

            if (request.status === "paused") {
              feed = pauseFeed(feed, now);
            }

            yield* store.update(feed);

            return feed;
          })
        );
      });

      const remove = Effect.fn("Feeds.remove")(function* remove(
        actor: Actor,
        feedId: FeedId
      ) {
        const current = yield* found(actor, feedId);

        yield* mayChangeStarted(actor, current, mayStart(actor, current.mode));

        if (!(yield* store.remove(actor.workspaceId, feedId))) {
          yield* new FeedNotFound({ feedId });
        }
      });

      const preview = Effect.fn("Feeds.preview")(function* preview(
        actor: Actor,
        raw: string,
        template: Option.Option<string>
      ) {
        yield* Effect.fromResult(authorize(actor, "post:create"));

        const url = yield* Effect.fromResult(parseFeedAddress(raw));

        const written = yield* Effect.fromResult(
          parseTemplate(Option.getOrElse(template, () => defaultTemplate))
        );

        const { document } = yield* readFor(actor, url);

        const shown: FeedPreview = {
          items: newestFirst(distinctItems(document.items))
            .slice(0, previewedItems)
            .map((entry) => ({ entry, text: writtenFrom(written, entry) })),
          title: document.title,
        };

        return shown;
      });

      // ---- The run ----

      // Stops the feed for `reason`, telling those it concerns, under its
      // row's lock, unless it changed since (a member resumed or moved
      // it): the next run judges it anew.
      const stopped = Effect.fn("Feeds.stopped")(function* stopped(
        planned: Feed,
        reason: FeedStopReason
      ) {
        return yield* transaction(
          Effect.gen(function* stop() {
            const locked = yield* store.lock(planned.workspaceId, planned.id);

            if (
              Option.isNone(locked) ||
              locked.value.status._tag !== "active" ||
              locked.value.url !== planned.url
            ) {
              return false;
            }

            const feed = stopFeed(locked.value, reason, yield* DateTime.now);

            yield* store.update(feed);
            yield* notices.stopped(feed, reason);

            return true;
          })
        );
      });

      // Writes what a read gave on the feed as it is now, if it still is
      // active at the same address; stops it, telling, when that stops it.
      const afterRead = Effect.fn("Feeds.afterRead")(function* afterRead(
        planned: Feed,
        written: (feed: Feed, now: DateTime.Utc) => Feed
      ) {
        return yield* transaction(
          Effect.gen(function* write() {
            const locked = yield* store.lock(planned.workspaceId, planned.id);

            if (
              Option.isNone(locked) ||
              locked.value.status._tag !== "active" ||
              locked.value.url !== planned.url
            ) {
              return false;
            }

            const feed = written(locked.value, yield* DateTime.now);

            yield* store.update(feed);

            if (feed.status._tag === "stopped") {
              yield* notices.stopped(feed, feed.status.reason);

              return true;
            }

            return false;
          })
        );
      });

      // Takes a due feed for this run: held for `readLease` by writing when
      // it is next due, under its row's lock, skipping one held.
      const leased = Effect.fn("Feeds.leased")(function* leased(
        planned: Feed,
        now: DateTime.Utc
      ) {
        return yield* transaction(
          Effect.gen(function* lease() {
            const locked = yield* store.lockUnlessHeld(planned.id);

            if (Option.isNone(locked) || !isDue(locked.value, now)) {
              return Option.none<Feed>();
            }

            // Held from when it is taken, not from when the run began: a
            // feed taken late in a run keeps its whole lease.
            const takenAt = yield* DateTime.now;

            yield* store.update(
              leaseFeed(locked.value, DateTime.addDuration(takenAt, readLease))
            );

            return Option.some(locked.value);
          })
        );
      });

      // A draft of the item as the feed's starter, in one transaction with
      // the item's record: none when another run made it. A draft whose
      // channels the workspace no longer all has is made for none, for a
      // person to choose.
      const draftOf = Effect.fn("Feeds.draftOf")(function* draftOf(
        actor: Actor,
        feed: Feed,
        entry: FeedEntry,
        content: PostContent,
        reason: Option.Option<FeedItemReason>,
        recorded: boolean
      ) {
        const request = (channelIds: readonly ChannelId[]) => ({
          channelIds,
          content,
          ...Option.match(feed.channelSetId, {
            onNone: () => ({}),
            onSome: (setId) => ({
              presets: {
                channelSets: [setId],
                defaultSignatures: false,
                signatureId: Option.none(),
              },
            }),
          }),
        });

        return yield* transaction(
          Effect.gen(function* made() {
            if (!recorded) {
              const kept = yield* store.record(feed.id, [
                {
                  digest: entry.digest,
                  itemAt: entry.publishedAt,
                  outcome: "claimed",
                  pictureSkipped: Option.none(),
                  postId: Option.none(),
                  reason: Option.none(),
                  seenAt: yield* DateTime.now,
                },
              ]);

              if (!kept.has(entry.digest)) {
                return Option.none<PostId>();
              }
            } else if (
              !(yield* store.settleClaim(
                feed.id,
                entry.digest,
                Option.isSome(reason) ? "heldBack" : "made",
                reason
              ))
            ) {
              // Another run, or a resume, settled the claim first.
              return Option.none<PostId>();
            }

            const draft = yield* drafts
              .create(actor, request(feed.channelIds))
              .pipe(
                Effect.catchTags({
                  ChannelSetNotFound: () =>
                    drafts.create(actor, { channelIds: [], content }),
                  UnknownChannels: () =>
                    drafts.create(actor, { channelIds: [], content }),
                })
              );

            yield* store.settle(
              feed.id,
              entry.digest,
              Option.isSome(reason) ? "heldBack" : "made",
              reason,
              Option.some(draft.post.id)
            );

            return Option.some(draft.post.id);
          })
        );
      });

      type Made = "made" | "skipped" | "starterGone" | "queueGone";

      // The item on the feed's queue, as its starter: its record claimed
      // first, the send keyed by the feed and the item so a run taken up
      // again answers the post the first made, then what came of it. What
      // the queue refuses becomes a draft.
      const queued = Effect.fn("Feeds.queued")(function* queued(
        actor: Actor,
        feed: Feed,
        entry: FeedEntry,
        content: PostContent,
        recorded: boolean
      ) {
        if (!recorded) {
          const kept = yield* store.record(feed.id, [
            {
              digest: entry.digest,
              itemAt: entry.publishedAt,
              outcome: "claimed",
              pictureSkipped: Option.none(),
              postId: Option.none(),
              reason: Option.none(),
              seenAt: yield* DateTime.now,
            },
          ]);

          if (!kept.has(entry.digest)) {
            return "skipped" as const;
          }
        }

        const queue = yield* queueNamed(feed.workspaceId, feed.queueId).pipe(
          withPorts,
          Effect.map(Option.some),
          Effect.catchTag("QueueNotFound", () => Effect.succeed(Option.none()))
        );

        if (Option.isNone(queue)) {
          yield* draftOf(
            actor,
            feed,
            entry,
            content,
            Option.some("queueGone"),
            true
          );

          return "queueGone" as const;
        }

        const key = `feed:${feed.id}:${entry.digest}`;

        const heldBack = (reason: FeedItemReason) =>
          draftOf(actor, feed, entry, content, Option.some(reason), true).pipe(
            Effect.as("made" as const)
          );

        return yield* scheduling
          .send(actor, {
            allowDuplicate: false,
            channelIds: feed.channelIds,
            content,
            idempotency: Option.some({ fingerprint: key, key }),
            placement: { _tag: "queue", queueId: Option.some(queue.value.id) },
            ...Option.match(feed.channelSetId, {
              onNone: () => ({}),
              onSome: (setId) => ({
                presets: {
                  channelSets: [setId],
                  defaultSignatures: false,
                  signatureId: Option.none(),
                },
              }),
            }),
            timeZone: queue.value.timeZone,
          })
          .pipe(
            Effect.flatMap((sent) =>
              store
                .settle(
                  feed.id,
                  entry.digest,
                  "made",
                  Option.none(),
                  Option.some(sent.post.id)
                )
                .pipe(Effect.as("made" as const))
            ),
            Effect.catchTags({
              ChannelSetNotFound: () => heldBack("noChannels"),
              DuplicateContent: () => heldBack("duplicate"),
              IdempotencyKeyReused: () => heldBack("duplicate"),
              MissingPermission: () =>
                store
                  .settle(
                    feed.id,
                    entry.digest,
                    "abandoned",
                    Option.none(),
                    Option.none()
                  )
                  .pipe(Effect.as("starterGone" as const)),
              PlanLimitReached: () => heldBack("planLimit"),
              PostContentRejected: () => heldBack("contentRejected"),
              PostNotFound: () => heldBack("contentRejected"),
              QueueHasNoRoom: () => heldBack("queueFull"),
              QueueNotFound: () =>
                draftOf(
                  actor,
                  feed,
                  entry,
                  content,
                  Option.some("queueGone"),
                  true
                ).pipe(Effect.as("queueGone" as const)),
              ScheduleInPast: () => heldBack("queueFull"),
              SignatureNotFound: () => heldBack("contentRejected"),
              UnknownChannels: () => heldBack("noChannels"),
              UnknownMedia: () => heldBack("contentRejected"),
              UnknownTags: () => heldBack("contentRejected"),
            })
          );
      });

      // One item made as the feed says, or skipped when the template
      // writes nothing from it.
      const makeItem = Effect.fn("Feeds.makeItem")(function* makeItem(
        actor: Actor,
        feed: Feed,
        entry: FeedEntry,
        recorded: boolean
      ) {
        const text = writtenFrom(feed.template, entry);
        const now = yield* DateTime.now;

        if (Option.isNone(text)) {
          // Longer than a post holds, or nothing at all.
          const reason: FeedItemReason = writtenTooLong(feed.template, entry)
            ? "contentRejected"
            : "empty";

          // Kept as skipped, whether a run before claimed it or not.
          yield* store.record(feed.id, [
            {
              digest: entry.digest,
              itemAt: entry.publishedAt,
              outcome: "skipped",
              pictureSkipped: Option.none(),
              postId: Option.none(),
              reason: Option.some(reason),
              seenAt: now,
            },
          ]);
          yield* store.settle(
            feed.id,
            entry.digest,
            "skipped",
            Option.some(reason),
            Option.none()
          );

          return "skipped" as const;
        }

        // A draft refused, or held back as one: the item is skipped with
        // why; the starter who may no longer make it stops the feed.
        const skipped = (reason: FeedItemReason) =>
          store
            .record(feed.id, [
              {
                digest: entry.digest,
                itemAt: entry.publishedAt,
                outcome: "skipped",
                pictureSkipped: Option.none(),
                postId: Option.none(),
                reason: Option.some(reason),
                seenAt: now,
              },
            ])
            .pipe(
              Effect.andThen(
                store.settle(
                  feed.id,
                  entry.digest,
                  "skipped",
                  Option.some(reason),
                  Option.none()
                )
              ),
              Effect.as("skipped" as const)
            );

        // The picture comes before the item's transaction: a crash after
        // the import leaves the asset in the library, unattached.
        const picture =
          feed.attachPicture && Option.isSome(entry.pictureUrl)
            ? Option.some(
                yield* pictures.attach(
                  actor,
                  entry.pictureUrl.value,
                  Option.getOrElse(entry.title, () => "")
                )
              )
            : Option.none<FeedPicture>();

        const content = contentOf(
          text.value,
          picture.pipe(
            Option.flatMap((had) =>
              had._tag === "attached"
                ? Option.some(
                    new MediaAttachment({
                      altText: Option.getOrElse(entry.title, () => ""),
                      mediaId: had.mediaId,
                    })
                  )
                : Option.none()
            )
          )
        );

        const attempt: Effect.Effect<
          Made,
          | ChannelSetNotFound
          | DatabaseError
          | MissingPermission
          | PostContentRejected
          | SignatureNotFound
          | UnknownChannels
          | UnknownMedia
          | UnknownTags
        > =
          feed.mode === "queue"
            ? queued(actor, feed, entry, content, recorded)
            : draftOf(
                actor,
                feed,
                entry,
                content,
                Option.none(),
                recorded
              ).pipe(
                Effect.map((post) => (Option.isSome(post) ? "made" : "skipped"))
              );

        const outcome = yield* attempt.pipe(
          Effect.catchTags({
            ChannelSetNotFound: () => skipped("noChannels"),
            MissingPermission: () =>
              store
                .settle(
                  feed.id,
                  entry.digest,
                  "abandoned",
                  Option.none(),
                  Option.none()
                )
                .pipe(Effect.as("starterGone" as const)),
            PostContentRejected: () => skipped("contentRejected"),
            SignatureNotFound: () => skipped("contentRejected"),
            UnknownChannels: () => skipped("noChannels"),
            UnknownMedia: () => skipped("contentRejected"),
            UnknownTags: () => skipped("contentRejected"),
          })
        );

        // Kept on the item, whatever came of it: why it went without.
        if (Option.isSome(picture) && picture.value._tag === "skipped") {
          yield* store.skipPicture(feed.id, entry.digest, picture.value.reason);
        }

        return outcome;
      });

      // What a read's document makes, as the feed's starter: the sends a
      // run before left claimed taken up again, then the new items.
      const makeFrom = Effect.fn("Feeds.makeFrom")(function* makeFrom(
        actor: Actor,
        feed: Feed,
        document: FeedDocument,
        claims: readonly FeedItemRecord[]
      ) {
        const now = yield* DateTime.now;

        const byDigest = new Map(
          document.items.map((entry) => [entry.digest, entry])
        );

        let made = 0;

        const counted = (outcome: Made) => {
          if (outcome === "made") {
            made += 1;
          }

          return outcome;
        };

        for (const claim of claims) {
          const entry = byDigest.get(claim.digest);

          // Only a queue's send leaves a claim: a feed that makes drafts
          // now never makes one of it, as its post may be out already.
          if (feed.mode !== "queue") {
            yield* store.settleClaim(
              feed.id,
              claim.digest,
              "abandoned",
              Option.none()
            );
          } else if (entry !== undefined) {
            const outcome = counted(yield* makeItem(actor, feed, entry, true));

            if (outcome === "starterGone" || outcome === "queueGone") {
              return { made, stop: Option.some<FeedStopReason>(outcome) };
            }
          }
        }

        const listedNow = document.items.map(({ digest }) => digest);
        const seen = yield* store.seen(feed.id, listedNow);

        // What this read lists is kept by retention, made or not.
        yield* store.listed(feed.id, listedNow, now);

        const fresh = newItems(
          document.items,
          seen,
          feed.since,
          yield* store.madeSince(feed.id, DateTime.startOf(now, "day"))
        );

        yield* store.record(
          feed.id,
          fresh.tooMany.map((entry) => ({
            digest: entry.digest,
            itemAt: entry.publishedAt,
            outcome: "skipped",
            pictureSkipped: Option.none(),
            postId: Option.none(),
            reason: Option.some("tooMany"),
            seenAt: now,
          }))
        );

        for (const entry of fresh.make) {
          const outcome = counted(yield* makeItem(actor, feed, entry, false));

          if (outcome === "starterGone" || outcome === "queueGone") {
            return { made, stop: Option.some<FeedStopReason>(outcome) };
          }
        }

        return { made, stop: Option.none<FeedStopReason>() };
      });

      interface Checked {
        readonly failed: boolean;
        readonly made: number;
        readonly read: boolean;
        readonly stopped: boolean;
      }

      const notRead: Checked = {
        failed: false,
        made: 0,
        read: false,
        stopped: false,
      };

      // Reads one due feed and makes what it brings.
      const checkOne = Effect.fn("Feeds.checkOne")(function* checkOne(
        planned: Feed,
        now: DateTime.Utc
      ) {
        const taken = yield* leased(planned, now);

        if (Option.isNone(taken)) {
          return notRead;
        }

        const feed = taken.value;

        // Claims older than a key's lifetime are never sent again.
        const claims = yield* store.claimed(feed.id);
        const cutoff = DateTime.subtractDuration(now, claimLifetime);

        for (const claim of claims) {
          if (DateTime.isLessThan(claim.seenAt, cutoff)) {
            yield* store.settle(
              feed.id,
              claim.digest,
              "abandoned",
              Option.none(),
              Option.none()
            );
          }
        }

        const open = claims.filter(
          ({ seenAt }) => !DateTime.isLessThan(seenAt, cutoff)
        );

        // A send to take up needs the item again: read it whole.
        const read = yield* source
          .read(feed.url, open.length > 0 ? noValidators : feed)
          .pipe(Effect.result);

        if (Result.isFailure(read)) {
          const { failure, retryAfterSeconds } = read.failure;

          const stoppedNow = yield* afterRead(feed, (current, at) =>
            readFailed(
              current,
              failure,
              retryAfterSeconds.pipe(Option.map(Duration.seconds)),
              at
            )
          );

          return { ...notRead, failed: true, read: true, stopped: stoppedNow };
        }

        if (read.success._tag === "notModified") {
          yield* afterRead(feed, (current, at) =>
            readSucceeded(current, at, Option.none())
          );

          return { ...notRead, read: true };
        }

        const { document, validators } = read.success;
        const starter = yield* actors.of(feed);

        if (starter._tag === "gone") {
          return {
            ...notRead,
            read: true,
            stopped: yield* stopped(feed, "starterGone"),
          };
        }

        // Locked out for now: the items wait, and the validators of this
        // read are not kept, so the next read gives them again.
        if (starter._tag === "lockedOut") {
          yield* afterRead(feed, (current, at) =>
            readSucceeded(current, at, Option.none())
          );

          return { ...notRead, read: true };
        }

        const outcome = yield* makeFrom(starter.actor, feed, document, open);

        if (Option.isSome(outcome.stop)) {
          return {
            ...notRead,
            made: outcome.made,
            read: true,
            stopped: yield* stopped(feed, outcome.stop.value),
          };
        }

        yield* afterRead(feed, (current, at) =>
          readSucceeded(
            current,
            at,
            Option.some({ title: document.title, validators })
          )
        );

        return { ...notRead, made: outcome.made, read: true };
      });

      const poll = Effect.fn("Feeds.poll")(function* poll(at: DateTime.Utc) {
        const now = yield* DateTime.now;
        const deadline = DateTime.addDuration(at, runBudget);

        const tally = yield* Ref.make({
          failed: 0,
          made: 0,
          read: 0,
          stopped: 0,
        });

        const late = yield* Ref.make(false);

        let after = Option.none<{ id: FeedId; nextCheckAt: DateTime.Utc }>();

        for (;;) {
          const page = yield* store.due(now, after, duePageSize);

          yield* Effect.forEach(
            page,
            (feed) =>
              Effect.gen(function* reading() {
                if (
                  (yield* Ref.get(late)) ||
                  DateTime.isGreaterThanOrEqualTo(yield* DateTime.now, deadline)
                ) {
                  yield* Ref.set(late, true);

                  return;
                }

                const checked = yield* checkOne(feed, now).pipe(
                  // A feed that fails for now (the database), or meets a
                  // bug, is left for a later run, and said: ids and codes
                  // only. The run goes on with the other feeds.
                  Effect.catchTag("DatabaseError", (failure) =>
                    Effect.logWarning("A feed could not be read", failure).pipe(
                      Effect.annotateLogs({ feedId: feed.id }),
                      Effect.as({ ...notRead, failed: true })
                    )
                  ),
                  Effect.catchDefect((defect) =>
                    Effect.logError("A feed's run met a defect", defect).pipe(
                      Effect.annotateLogs({ feedId: feed.id }),
                      Effect.as({ ...notRead, failed: true })
                    )
                  )
                );

                yield* Ref.update(tally, (counts) => ({
                  failed: counts.failed + (checked.failed ? 1 : 0),
                  made: counts.made + checked.made,
                  read: counts.read + (checked.read ? 1 : 0),
                  stopped: counts.stopped + (checked.stopped ? 1 : 0),
                }));
              }),
            { concurrency: feedConcurrency, discard: true }
          );

          const last = page.at(-1);

          if (
            (yield* Ref.get(late)) ||
            last === undefined ||
            page.length < duePageSize
          ) {
            break;
          }

          after = Option.some({ id: last.id, nextCheckAt: last.nextCheckAt });
        }

        const counts = yield* Ref.get(tally);

        const left = yield* store.overdue(
          DateTime.add(now, { milliseconds: 1 })
        );

        const run: FeedRun = {
          ...counts,
          left,
          unfinished: (yield* Ref.get(late)) && left > 0,
        };

        return run;
      });

      const prune = Effect.gen(function* prune() {
        const now = yield* DateTime.now;

        return {
          items: yield* store.prune(itemsKept),
          reads: yield* budget.purge(DateTime.subtract(now, { days: 1 })),
        };
      });

      return Feeds.of({
        change,
        create,
        get,
        items,
        list,
        overdue: store.overdue,
        poll,
        preview,
        prune,
        remove,
      });
    })
  );
}
