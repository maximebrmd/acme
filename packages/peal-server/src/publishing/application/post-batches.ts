import { Context, DateTime, Effect, Layer, Option, Result } from "effect";

import type { DuplicateContent } from "#publishing/domain/duplicate-content.ts";
import { idempotencyKeyLifetime } from "#publishing/domain/idempotency.ts";
import type { PostContentRejected } from "#publishing/domain/post-content-rejected.ts";
import type { ScheduleInPast } from "#publishing/domain/schedule-in-past.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";
import type { PlanLimitReached } from "#shared/domain/plan-limit-reached.ts";

import type { IdempotencyKeyReused } from "./idempotency-key-reused.ts";
import { IdempotencyKeys } from "./idempotency-keys.ts";
import type { KeyUse } from "./idempotency-keys.ts";
import { PostChecks } from "./post-checks.ts";
import type { PostCheck } from "./post-checks.ts";
import type { PostNotFound } from "./post-not-found.ts";
import { PostScheduling } from "./post-scheduling.ts";
import type { SendPostRequest, SentPost } from "./post-scheduling.ts";
import type { UnknownChannels } from "./unknown-channels.ts";
import type { UnknownMedia } from "./unknown-media.ts";

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
  | UnknownMedia;

/**
 * What checking one request of several found: its check, or that its
 * idempotency key was used already, by this request or by another.
 */
export type RequestCheck =
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
     * with another request (`keyReused`), which sending refuses. Needs
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

        return yield* Effect.forEach(
          requests,
          Effect.fnUntraced(function* checkOne({
            allowDuplicate = false,
            at,
            channelIds,
            content,
            idempotency,
            options = [],
          }) {
            const used = yield* Option.match(idempotency, {
              onNone: () => Effect.succeed(Option.none<KeyUse>()),
              onSome: (keyed) => keys.find(actor.workspaceId, keyed, since),
            });

            if (Option.isSome(used)) {
              const known: RequestCheck = used.value.sameRequest
                ? { _tag: "made" }
                : { _tag: "keyReused" };

              return known;
            }

            const checked: RequestCheck = {
              _tag: "checked",
              check: yield* checks.check(actor, {
                allowDuplicate,
                channelIds,
                content,
                options,
                when: Option.some({ at }),
              }),
            };

            return checked;
          }),
          { concurrency: 1 }
        );
      });

      return PostBatches.of({ check, send });
    })
  );
}
