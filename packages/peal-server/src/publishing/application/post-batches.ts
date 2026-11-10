import {
  Array as Arr,
  Context,
  DateTime,
  Duration,
  Effect,
  Layer,
  Option,
  Result,
} from "effect";

import type { DuplicateContent } from "#publishing/domain/duplicate-content.ts";
import {
  contentOn,
  duplicateWindow,
} from "#publishing/domain/duplicate-window.ts";
import { idempotencyKeyLifetime } from "#publishing/domain/idempotency.ts";
import type { PostContentRejected } from "#publishing/domain/post-content-rejected.ts";
import type { PostContent } from "#publishing/domain/post-content.ts";
import { postingMonthOf, sameMonth } from "#publishing/domain/posting-month.ts";
import type { ScheduleInPast } from "#publishing/domain/schedule-in-past.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import { roomForOneMore } from "#shared/domain/allowance.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";
import type { PlanLimitReached } from "#shared/domain/plan-limit-reached.ts";

import type { IdempotencyKeyReused } from "./idempotency-key-reused.ts";
import { IdempotencyKeys } from "./idempotency-keys.ts";
import type { KeyUse } from "./idempotency-keys.ts";
import { PostAllowance } from "./post-allowance.ts";
import { isSendable, PostChecks } from "./post-checks.ts";
import type { PostCheck } from "./post-checks.ts";
import type { PostNotFound } from "./post-not-found.ts";
import { PostRepository } from "./post-repository.ts";
import { PostScheduling } from "./post-scheduling.ts";
import type { SendPostRequest, SentPost } from "./post-scheduling.ts";
import type { UnknownChannels } from "./unknown-channels.ts";
import type { UnknownMedia } from "./unknown-media.ts";
import type { UnknownTags } from "./unknown-tags.ts";

/** The most posts made in one request. */
export const maxBulkPosts = 50;

/**
 * Why one post of several was not made: what sending it alone would have
 * failed with. MissingPermission is a post that needs a permission the
 * others do not, as reading media for one that shows some.
 */
export type SendRefusal =
  | DuplicateContent
  | IdempotencyKeyReused
  | MissingPermission
  | PlanLimitReached
  | PostContentRejected
  | PostNotFound
  | ScheduleInPast
  | UnknownChannels
  | UnknownMedia
  | UnknownTags;

/**
 * What checking one request of several found: its check, or that its
 * idempotency key was used already, by this request or by another.
 */
/**
 * A request that says what an earlier one of the same file says, on some
 * of the same channels, near its time: sent after it, it would be refused
 * as a duplicate.
 */
export interface RepeatedRequest {
  readonly _tag: "repeats";
  readonly channelIds: readonly ChannelId[];
  /** The place of the earlier request among those checked, from 0. */
  readonly earlier: number;
}

export type RequestCheck =
  | RepeatedRequest
  | { readonly _tag: "checked"; readonly check: PostCheck }
  | { readonly _tag: "keyReused" }
  | { readonly _tag: "made" };

/** What became of one post of several: made, or why not. */
export type SendOutcome = Result.Result<SentPost, SendRefusal>;

const refused = (refusal: SendRefusal) =>
  Effect.succeed<SendOutcome>(Result.fail(refusal));

/**
 * Sending several posts in one request. Each is sent as `PostScheduling`
 * sends one, in a transaction of its own that starts its own job: never
 * one transaction for them all, which would hold the plan's month and the
 * channels' content claimed while the platforms say what their accounts
 * take. They are taken in order, one at a time, so the plan's room goes to
 * the first ones and none is counted twice, and each is compared with the
 * ones before it for the same content on the same channel. One that is
 * refused keeps no other from being made, and nothing is undone.
 *
 * A request sent again is made safe post by post, by the idempotency key
 * each carries: the posts already made are answered, the others made.
 * Needs post:schedule, or what the workspace's approval gate lets ask
 * (`PostScheduling.mayAsk`): posts it holds are made, and wait.
 */
export class PostBatches extends Context.Service<
  PostBatches,
  {
    /**
     * Sends each request, and answers what became of each, in their order.
     * Fails as a whole only without post:schedule, before anything is
     * made, or when the database does: the posts made before stay made.
     */
    /**
     * Checks each request as `PostChecks` does, making nothing, and
     * answers each check, in their order: what an import does to a whole
     * file before it makes its first post. A request whose idempotency
     * key was used already is not checked again, least of all against the
     * post it made: it is `made`, which sending answers, or its key came
     * with another request (`keyReused`), which sending refuses. The
     * requests are also checked as the file they are: one that an earlier
     * one leaves no room for in its month passes the plan's limit, one
     * that says what an earlier one says near its time `repeats` it, and a
     * key two of them carry with different posts is `keyReused`. Needs
     * post:schedule too, as the sending it prepares does.
     */
    readonly check: (
      actor: Actor,
      requests: readonly SendPostRequest[]
    ) => Effect.Effect<
      readonly RequestCheck[],
      DatabaseError | MissingPermission
    >;
    readonly send: (
      actor: Actor,
      requests: readonly SendPostRequest[]
    ) => Effect.Effect<
      readonly SendOutcome[],
      DatabaseError | MissingPermission
    >;
  }
>()("peal-server/publishing/application/PostBatches") {
  static readonly layer = Layer.effect(
    PostBatches,
    Effect.gen(function* PostBatchesLive() {
      const scheduling = yield* PostScheduling;
      const checks = yield* PostChecks;
      const keys = yield* IdempotencyKeys;
      const allowance = yield* PostAllowance;
      const posts = yield* PostRepository;

      // The requests of a file found sendable so far, as the ones after
      // them are checked against them.
      interface Accepted {
        readonly at: DateTime.Utc;
        readonly channelIds: readonly ChannelId[];
        readonly content: PostContent;
        readonly place: number;
      }

      // The channels on which the request says what an accepted one says,
      // less than `duplicateWindow` from its time.
      const repeatedOn = (
        earlier: Accepted,
        at: DateTime.Utc,
        channelIds: readonly ChannelId[],
        content: PostContent
      ): readonly ChannelId[] =>
        Duration.isLessThan(
          DateTime.distance(earlier.at, at).pipe(Duration.abs),
          duplicateWindow
        )
          ? channelIds.filter(
              (channelId) =>
                earlier.channelIds.includes(channelId) &&
                contentOn(earlier.content, channelId) ===
                  contentOn(content, channelId)
            )
          : [];

      // The plan's limit a post at `at` passes once the file's earlier
      // posts of its month are made, if it does.
      const monthFull = Effect.fn("PostBatches.monthFull")(function* monthFull(
        actor: Actor,
        at: DateTime.Utc,
        accepted: readonly Accepted[]
      ) {
        const allowed = yield* allowance.scheduledPerMonth(actor.workspaceId);

        if (Option.isNone(allowed)) {
          return Option.none<PlanLimitReached>();
        }

        const going = yield* posts.countGoingOut(
          actor.workspaceId,
          postingMonthOf(at),
          Option.none()
        );

        const before = accepted.filter((earlier) =>
          sameMonth(earlier.at, at)
        ).length;

        return Result.match(
          roomForOneMore("scheduledPosts", allowed, going + before),
          {
            onFailure: (reached) => Option.some(reached),
            onSuccess: () => Option.none<PlanLimitReached>(),
          }
        );
      });

      // What became of one: a refusal is its answer, and only a failure
      // of the database stops the rest.
      const sendOne = (actor: Actor, request: SendPostRequest) =>
        scheduling.send(actor, request).pipe(
          Effect.map((sent): SendOutcome => Result.succeed(sent)),
          Effect.catchTags({
            DuplicateContent: refused,
            IdempotencyKeyReused: refused,
            MissingPermission: refused,
            PlanLimitReached: refused,
            PostContentRejected: refused,
            PostNotFound: refused,
            ScheduleInPast: refused,
            UnknownChannels: refused,
            UnknownMedia: refused,
            UnknownTags: refused,
          })
        );

      const send = Effect.fn("PostBatches.send")(function* send(
        actor: Actor,
        requests: readonly SendPostRequest[]
      ) {
        yield* scheduling.mayAsk(actor);

        return yield* Effect.forEach(
          requests,
          (request) => sendOne(actor, request),
          { concurrency: 1 }
        );
      });

      const check = Effect.fn("PostBatches.check")(function* check(
        actor: Actor,
        requests: readonly SendPostRequest[]
      ) {
        yield* scheduling.mayAsk(actor);

        const since = DateTime.subtractDuration(
          yield* DateTime.now,
          idempotencyKeyLifetime
        );

        const now = yield* DateTime.now;
        const accepted: Accepted[] = [];
        const keyed = new Map<string, string>();

        return yield* Effect.forEach(
          requests,
          Effect.fnUntraced(function* checkOne(
            {
              allowDuplicate = false,
              at,
              channelIds,
              content,
              idempotency,
              options = [],
            },
            place
          ) {
            const used = yield* Option.match(idempotency, {
              onNone: () => Effect.succeed(Option.none<KeyUse>()),
              onSome: (request) => keys.find(actor.workspaceId, request, since),
            });

            if (Option.isSome(used)) {
              const known: RequestCheck = used.value.sameRequest
                ? { _tag: "made" }
                : { _tag: "keyReused" };

              return known;
            }

            // A key an earlier request of the file carries: the same
            // request again answers the post that one makes, another is
            // refused once that one is made.
            const carried = idempotency.pipe(
              Option.flatMapNullishOr(({ key }) => keyed.get(key))
            );

            if (Option.isSome(carried) && Option.isSome(idempotency)) {
              const again: RequestCheck =
                carried.value === idempotency.value.fingerprint
                  ? { _tag: "made" }
                  : { _tag: "keyReused" };

              return again;
            }

            const found = yield* checks.check(actor, {
              allowDuplicate,
              channelIds,
              content,
              options,
              when: Option.some({ at }),
            });

            if (!isSendable(found)) {
              const alone: RequestCheck = { _tag: "checked", check: found };

              return alone;
            }

            // Sendable alone: now as one of the file's, after the others.
            const when = Option.getOrElse(at, () => now);

            const repeated = allowDuplicate
              ? Option.none<RepeatedRequest>()
              : Arr.findFirst(accepted, (earlier) => {
                  const shared = repeatedOn(earlier, when, channelIds, content);

                  return shared.length === 0
                    ? Option.none()
                    : Option.some<RepeatedRequest>({
                        _tag: "repeats",
                        channelIds: shared,
                        earlier: earlier.place,
                      });
                });

            if (Option.isSome(repeated)) {
              return repeated.value;
            }

            const planLimit = yield* monthFull(actor, when, accepted);

            if (Option.isSome(planLimit)) {
              const full: RequestCheck = {
                _tag: "checked",
                check: { ...found, planLimit },
              };

              return full;
            }

            accepted.push({ at: when, channelIds, content, place });

            if (Option.isSome(idempotency)) {
              keyed.set(idempotency.value.key, idempotency.value.fingerprint);
            }

            const fine: RequestCheck = { _tag: "checked", check: found };

            return fine;
          }),
          { concurrency: 1 }
        );
      });

      return PostBatches.of({ check, send });
    })
  );
}
