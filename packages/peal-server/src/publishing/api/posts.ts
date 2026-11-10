import { Duration, Effect, Option } from "effect";
import { HttpApiBuilder, HttpApiError } from "effect/http-api";
import {
  Api,
  CurrentMember,
  defaultDraftPageSize,
  DuplicatePost,
  Forbidden,
  IdempotencyKeyReused,
  InvalidTimeRange,
  PostContentInvalid,
  PostNotFound,
  PostStatusConflict,
  ScheduleInPast,
  TargetStatusConflict,
  UnknownChannels,
  UnknownMedia,
} from "peal-contract";

import { PostChecks } from "#publishing/application/post-checks.ts";
import { PostDrafts } from "#publishing/application/post-drafts.ts";
import { PostFollowUp } from "#publishing/application/post-follow-up.ts";
import type { Confirmation } from "#publishing/application/post-follow-up.ts";
import { PostOutcomes } from "#publishing/application/post-outcomes.ts";
import { PostQueries } from "#publishing/application/post-queries.ts";
import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import type { DuplicateContent } from "#publishing/domain/duplicate-content.ts";
import type { InvalidPostTransition } from "#publishing/domain/invalid-post-transition.ts";
import type { InvalidTargetTransition } from "#publishing/domain/invalid-target-transition.ts";
import type { PostContentRejected } from "#publishing/domain/post-content-rejected.ts";
import { actorOf } from "#shared/api/actor.ts";
import { limitRefusal } from "#shared/api/limit-reached.ts";
import type { PlanLimitReached as LimitReached } from "#shared/domain/plan-limit-reached.ts";

import { checkRequestFrom } from "./post-check-input.ts";
import { validationView } from "./post-check-view.ts";
import {
  channelIdsFrom,
  contentFrom,
  optionsFrom,
  postIdFrom,
  postIdOption,
  scheduleFrom,
  sendRequestFrom,
  targetIdFrom,
} from "./post-input.ts";
import { attemptView, postView } from "./post-view.ts";

// How the use cases' failures answer. A database failure is a server error.

const forbidden = () => Effect.fail(new Forbidden());

const notFound = () => Effect.fail(new PostNotFound());

const conflict = ({ from }: InvalidPostTransition) =>
  Effect.fail(new PostStatusConflict({ status: from }));

const contentInvalid = ({ violations }: PostContentRejected) =>
  Effect.fail(new PostContentInvalid({ violations }));

const unknownChannels = ({
  channelIds,
}: {
  readonly channelIds: readonly string[];
}) => Effect.fail(new UnknownChannels({ channelIds }));

const unknownMedia = ({ mediaIds }: { readonly mediaIds: readonly string[] }) =>
  Effect.fail(new UnknownMedia({ mediaIds }));

const inPast = () => Effect.fail(new ScheduleInPast());

const duplicate = ({ duplicates }: DuplicateContent) =>
  Effect.fail(
    new DuplicatePost({
      duplicates: duplicates.map(({ channelId, postId }) => ({
        channelId,
        postId,
      })),
    })
  );

const targetConflict = ({ from }: InvalidTargetTransition) =>
  Effect.fail(new TargetStatusConflict({ status: from }));

const followUpFailures = {
  DatabaseError: Effect.die,
  InvalidPostTransition: conflict,
  InvalidTargetTransition: targetConflict,
  MissingPermission: forbidden,
  PostNotFound: notFound,
} as const;

export const PostsHandlers = HttpApiBuilder.group(
  Api,
  "posts",
  Effect.fn(function* postsHandlers(handlers) {
    const checks = yield* PostChecks;
    const drafts = yield* PostDrafts;
    const followUp = yield* PostFollowUp;
    const outcomes = yield* PostOutcomes;
    const queries = yield* PostQueries;
    const scheduling = yield* PostScheduling;
    const limitReached = yield* limitRefusal;

    // The plan's limit a check found, as PlanLimitReached would tell it.
    const shortfallOf = (reached: LimitReached) =>
      limitReached(reached).pipe(
        Effect.flip,
        Effect.map(
          ({ allowed, billingUrl, limit, plan, planWithRoom, used }) => ({
            allowed,
            billingUrl,
            limit,
            plan,
            planWithRoom,
            used,
          })
        )
      );

    return handlers.handleAll({
      attempts: ({ params }) =>
        Effect.gen(function* attempts() {
          const actor = actorOf(yield* CurrentMember);
          const postId = yield* postIdFrom(params.postId);

          const made = yield* queries.attempts(actor, postId).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
              PostNotFound: notFound,
            })
          );

          return made.map(attemptView);
        }),
      cancel: ({ params }) =>
        Effect.gen(function* cancel() {
          const actor = actorOf(yield* CurrentMember);
          const postId = yield* postIdFrom(params.postId);

          const cancelled = yield* scheduling.cancel(actor, postId).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              InvalidPostTransition: conflict,
              MissingPermission: forbidden,
              PostNotFound: notFound,
            })
          );

          return postView(cancelled);
        }),
      confirm: ({ params, payload }) =>
        Effect.gen(function* confirm() {
          const actor = actorOf(yield* CurrentMember);
          const postId = yield* postIdFrom(params.postId);
          const targetId = yield* targetIdFrom(params.targetId);

          const confirmation: Confirmation =
            payload._tag === "published"
              ? {
                  _tag: "published",
                  permalink: Option.fromNullOr(payload.permalink),
                }
              : { _tag: "notPublished" };

          const confirmed = yield* followUp
            .confirm(actor, postId, targetId, confirmation)
            .pipe(Effect.catchTags(followUpFailures));

          return postView(confirmed);
        }),
      create: ({ payload }) =>
        Effect.gen(function* create() {
          const actor = actorOf(yield* CurrentMember);
          const channelIds = yield* channelIdsFrom(payload.channelIds);
          const content = yield* contentFrom(payload.content);
          const options = yield* optionsFrom(payload.options ?? []);

          const created = yield* drafts
            .create(actor, { channelIds, content, options })
            .pipe(
              Effect.catchTags({
                DatabaseError: Effect.die,
                MissingPermission: forbidden,
                PostContentRejected: contentInvalid,
                UnknownChannels: unknownChannels,
                UnknownMedia: unknownMedia,
              })
            );

          return postView(created);
        }),
      discard: ({ params }) =>
        Effect.gen(function* discard() {
          const actor = actorOf(yield* CurrentMember);
          const postId = yield* postIdFrom(params.postId);

          yield* drafts.discard(actor, postId).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              InvalidPostTransition: conflict,
              MissingPermission: forbidden,
              PostNotFound: notFound,
            })
          );
        }),
      drafts: ({ query }) =>
        Effect.gen(function* listDrafts() {
          const actor = actorOf(yield* CurrentMember);

          // A cursor is the id of the last draft of the page before.
          const after = Option.fromUndefinedOr(query.cursor).pipe(
            Option.map(postIdOption)
          );

          if (Option.isSome(after) && Option.isNone(after.value)) {
            return yield* new HttpApiError.BadRequest();
          }

          const page = yield* queries
            .listDrafts(actor, {
              after: Option.flatten(after),
              limit: query.limit ?? defaultDraftPageSize,
            })
            .pipe(
              Effect.catchTags({
                DatabaseError: Effect.die,
                MissingPermission: forbidden,
              })
            );

          return {
            items: page.items.map(postView),
            nextCursor: Option.getOrNull(page.next),
          };
        }),
      get: ({ params }) =>
        Effect.gen(function* get() {
          const actor = actorOf(yield* CurrentMember);
          const postId = yield* postIdFrom(params.postId);

          const found = yield* queries.get(actor, postId).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
              PostNotFound: notFound,
            })
          );

          return postView(found);
        }),
      list: ({ query }) =>
        Effect.gen(function* list() {
          const actor = actorOf(yield* CurrentMember);

          const listed = yield* queries.listScheduled(actor, query).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              InvalidTimeRange: () => Effect.fail(new InvalidTimeRange()),
              MissingPermission: forbidden,
            })
          );

          return listed.map(postView);
        }),
      outcome: ({ params, query }) =>
        Effect.gen(function* outcome() {
          const actor = actorOf(yield* CurrentMember);
          const postId = yield* postIdFrom(params.postId);

          const awaited = yield* outcomes
            .await(actor, postId, Duration.seconds(query.wait ?? 0))
            .pipe(
              Effect.catchTags({
                DatabaseError: Effect.die,
                MissingPermission: forbidden,
                PostNotFound: notFound,
              })
            );

          return postView(awaited);
        }),
      repost: ({ params }) =>
        Effect.gen(function* repost() {
          const actor = actorOf(yield* CurrentMember);
          const postId = yield* postIdFrom(params.postId);
          const targetId = yield* targetIdFrom(params.targetId);

          const reposted = yield* followUp
            .repost(actor, postId, targetId)
            .pipe(Effect.catchTags(followUpFailures));

          return postView(reposted);
        }),
      reschedule: ({ params, payload }) =>
        Effect.gen(function* reschedule() {
          const actor = actorOf(yield* CurrentMember);
          const postId = yield* postIdFrom(params.postId);
          const at = yield* scheduleFrom(payload.at, payload.timeZone);

          const moved = yield* scheduling.reschedule(actor, postId, at).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              InvalidPostTransition: conflict,
              MissingPermission: forbidden,
              PlanLimitReached: limitReached,
              PostContentRejected: contentInvalid,
              PostNotFound: notFound,
              ScheduleInPast: inPast,
              UnknownChannels: unknownChannels,
              UnknownMedia: unknownMedia,
            })
          );

          return postView(moved);
        }),
      schedule: ({ params, payload }) =>
        Effect.gen(function* schedule() {
          const actor = actorOf(yield* CurrentMember);
          const postId = yield* postIdFrom(params.postId);
          const channelIds = yield* channelIdsFrom(payload.channelIds);
          const at = yield* scheduleFrom(payload.at, payload.timeZone);

          const scheduled = yield* scheduling
            .scheduleDraft(actor, postId, { channelIds, schedule: at })
            .pipe(
              Effect.catchTags({
                DatabaseError: Effect.die,
                InvalidPostTransition: conflict,
                MissingPermission: forbidden,
                PlanLimitReached: limitReached,
                PostContentRejected: contentInvalid,
                PostNotFound: notFound,
                ScheduleInPast: inPast,
                UnknownChannels: unknownChannels,
                UnknownMedia: unknownMedia,
              })
            );

          return postView(scheduled);
        }),
      send: ({ headers, payload, query }) =>
        Effect.gen(function* send() {
          const actor = actorOf(yield* CurrentMember);

          const request = yield* sendRequestFrom(
            payload,
            headers["idempotency-key"]
          );

          const sent = yield* scheduling.send(actor, request).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              DuplicateContent: duplicate,
              IdempotencyKeyReused: () =>
                Effect.fail(new IdempotencyKeyReused()),
              MissingPermission: forbidden,
              PlanLimitReached: limitReached,
              PostContentRejected: contentInvalid,
              PostNotFound: notFound,
              ScheduleInPast: inPast,
              UnknownChannels: unknownChannels,
              UnknownMedia: unknownMedia,
            })
          );

          // Asked to wait, it answers once the post went out, or with what
          // it has when the time runs out.
          const awaited =
            query.wait === undefined || query.wait === 0
              ? sent
              : yield* outcomes
                  .await(actor, sent.post.id, Duration.seconds(query.wait))
                  .pipe(
                    Effect.catchTags({
                      DatabaseError: Effect.die,
                      MissingPermission: forbidden,
                      PostNotFound: notFound,
                    })
                  );

          return postView(awaited);
        }),
      unschedule: ({ params }) =>
        Effect.gen(function* unschedule() {
          const actor = actorOf(yield* CurrentMember);
          const postId = yield* postIdFrom(params.postId);

          const draft = yield* scheduling.unschedule(actor, postId).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              InvalidPostTransition: conflict,
              MissingPermission: forbidden,
              PostNotFound: notFound,
            })
          );

          return postView(draft);
        }),
      update: ({ params, payload }) =>
        Effect.gen(function* update() {
          const actor = actorOf(yield* CurrentMember);
          const postId = yield* postIdFrom(params.postId);
          const channelIds = yield* channelIdsFrom(payload.channelIds);
          const content = yield* contentFrom(payload.content);
          const options = yield* optionsFrom(payload.options ?? []);

          const updated = yield* drafts
            .update(actor, postId, { channelIds, content, options })
            .pipe(
              Effect.catchTags({
                DatabaseError: Effect.die,
                InvalidPostTransition: conflict,
                MissingPermission: forbidden,
                PostContentRejected: contentInvalid,
                PostNotFound: notFound,
                UnknownChannels: unknownChannels,
                UnknownMedia: unknownMedia,
              })
            );

          return postView(updated);
        }),
      validate: ({ payload }) =>
        Effect.gen(function* validate() {
          const actor = actorOf(yield* CurrentMember);
          const read = yield* checkRequestFrom(payload);

          const check = yield* checks.check(actor, read.request).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
            })
          );

          const shortfall = yield* Option.match(check.planLimit, {
            onNone: () => Effect.succeed(Option.none()),
            onSome: (reached) => shortfallOf(reached).pipe(Effect.asSome),
          });

          return validationView(check, read, shortfall);
        }),
    });
  })
);
