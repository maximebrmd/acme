import {
  Api,
  CurrentMember,
  Forbidden,
  InvalidTimeRange,
  PostContentInvalid,
  PostNotFound,
  PostStatusConflict,
  ScheduleInPast,
  UnknownChannels,
  UnknownMedia,
} from "acme-contract";
import { Effect } from "effect";
import { HttpApiBuilder } from "effect/http-api";

import { PostDrafts } from "#publishing/application/post-drafts.ts";
import { PostQueries } from "#publishing/application/post-queries.ts";
import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import type { InvalidPostTransition } from "#publishing/domain/invalid-post-transition.ts";
import type { PostContentRejected } from "#publishing/domain/post-content-rejected.ts";
import { actorOf } from "#shared/api/actor.ts";

import {
  channelIdsFrom,
  contentFrom,
  postIdFrom,
  scheduleFrom,
} from "./post-input.ts";
import { postView } from "./post-view.ts";

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

export const PostsHandlers = HttpApiBuilder.group(
  Api,
  "posts",
  Effect.fn(function* postsHandlers(handlers) {
    const drafts = yield* PostDrafts;
    const queries = yield* PostQueries;
    const scheduling = yield* PostScheduling;

    return handlers.handleAll({
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
