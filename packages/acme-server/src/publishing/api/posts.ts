import {
  Api,
  CurrentMember,
  defaultDraftPageSize,
  Forbidden,
  InvalidTimeRange,
  PostContentInvalid,
  PostNotFound,
  PostStatusConflict,
  ScheduleInPast,
  TargetStatusConflict,
  UnknownChannels,
  UnknownMedia,
} from "acme-contract";
import { Effect, Option } from "effect";
import { HttpApiBuilder, HttpApiError } from "effect/http-api";

import { PostDrafts } from "#publishing/application/post-drafts.ts";
import { PostFollowUp } from "#publishing/application/post-follow-up.ts";
import type { Confirmation } from "#publishing/application/post-follow-up.ts";
import { PostQueries } from "#publishing/application/post-queries.ts";
import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import type { InvalidPostTransition } from "#publishing/domain/invalid-post-transition.ts";
import type { InvalidTargetTransition } from "#publishing/domain/invalid-target-transition.ts";
import type { PostContentRejected } from "#publishing/domain/post-content-rejected.ts";
import { actorOf } from "#shared/api/actor.ts";

import {
  channelIdsFrom,
  contentFrom,
  postIdFrom,
  postIdOption,
  scheduleFrom,
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
    const drafts = yield* PostDrafts;
    const followUp = yield* PostFollowUp;
    const queries = yield* PostQueries;
    const scheduling = yield* PostScheduling;

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

          const created = yield* drafts
            .create(actor, { channelIds, content })
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
                PostContentRejected: contentInvalid,
                PostNotFound: notFound,
                ScheduleInPast: inPast,
                UnknownChannels: unknownChannels,
                UnknownMedia: unknownMedia,
              })
            );

          return postView(scheduled);
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

          const updated = yield* drafts
            .update(actor, postId, { channelIds, content })
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
    });
  })
);
