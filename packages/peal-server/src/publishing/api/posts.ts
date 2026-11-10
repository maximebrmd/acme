import { Duration, Effect, Match, Option, Result } from "effect";
import { HttpApiBuilder, HttpApiError } from "effect/http-api";
import {
  Api,
  CurrentMember,
  defaultDraftPageSize,
  DuplicatePost,
  IdempotencyKeyReused,
  ImportUnreadable,
  InvalidTimeRange,
  PostContentInvalid,
  PostNotFound,
  PostStatusConflict,
  ScheduleInPast,
  TargetStatusConflict,
  UnknownChannels,
  UnknownMedia,
} from "peal-contract";
import type {
  BulkPostResult,
  ImportRowResult,
  PostRefusal,
} from "peal-contract";

import { PostBatches } from "#publishing/application/post-batches.ts";
import { PostChecks } from "#publishing/application/post-checks.ts";
import { PostDrafts } from "#publishing/application/post-drafts.ts";
import { PostFollowUp } from "#publishing/application/post-follow-up.ts";
import type { Confirmation } from "#publishing/application/post-follow-up.ts";
import { PostOutcomes } from "#publishing/application/post-outcomes.ts";
import { PostQueries } from "#publishing/application/post-queries.ts";
import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import { PostSearch } from "#publishing/application/post-search.ts";
import type { DuplicateContent } from "#publishing/domain/duplicate-content.ts";
import type { InvalidPostTransition } from "#publishing/domain/invalid-post-transition.ts";
import type { InvalidTargetTransition } from "#publishing/domain/invalid-target-transition.ts";
import type { PostContentRejected } from "#publishing/domain/post-content-rejected.ts";
import { readImport } from "#publishing/domain/post-import.ts";
import { actorOf } from "#shared/api/actor.ts";
import { changesNothing } from "#shared/api/change-mark.ts";
import { forbidden } from "#shared/api/forbidden.ts";
import { limitRefusal } from "#shared/api/limit-reached.ts";

import { keyAt, newPostOf, readPost, sendRead } from "./post-batch.ts";
import type { ReadPost } from "./post-batch.ts";
import { checkRequestFrom } from "./post-check-input.ts";
import { validationOf } from "./post-check-view.ts";
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
import { refusalOfCheck, toldRefusal } from "./post-refusal.ts";
import { pageView, searchRequestFrom } from "./post-search.ts";
import { attemptView, postView } from "./post-view.ts";

// How the use cases' failures answer. A database failure is a server error.

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
    const batches = yield* PostBatches;
    const checks = yield* PostChecks;
    const drafts = yield* PostDrafts;
    const followUp = yield* PostFollowUp;
    const outcomes = yield* PostOutcomes;
    const queries = yield* PostQueries;
    const scheduling = yield* PostScheduling;
    const searching = yield* PostSearch;
    const limitReached = yield* limitRefusal;

    const toValidation = validationOf(limitReached);

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
      bulk: ({ headers, payload }) =>
        Effect.gen(function* bulk() {
          const actor = actorOf(yield* CurrentMember);

          const read = yield* Effect.all(
            payload.posts.map(({ idempotencyKey, ...post }, index) =>
              readPost(
                post,
                keyAt(idempotencyKey, headers["idempotency-key"], "bulk", index)
              )
            )
          );

          const answered = yield* sendRead(
            batches,
            limitReached,
            actor,
            read
          ).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
            })
          );

          // A refused item reads as the error `send` would have answered.
          const items = yield* Effect.all(
            answered.map((outcome, index) =>
              toldRefusal<BulkPostResult>(
                Result.match(outcome, {
                  onFailure: (refusal) => ({ _tag: "refused", index, refusal }),
                  onSuccess: (sent) => ({
                    _tag: "created",
                    index,
                    post: postView(sent),
                    replayed: sent.replayed,
                  }),
                })
              )
            )
          );

          const created = items.filter(({ _tag }) => _tag === "created").length;

          return { created, items, refused: items.length - created };
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
      import: ({ headers, payload }) =>
        Effect.gen(function* importPosts() {
          // A dry run reads and checks: it is no change to keep a record of.
          if (payload.dryRun === true) {
            yield* changesNothing;
          }

          const actor = actorOf(yield* CurrentMember);

          const rows = yield* Effect.fromResult(readImport(payload.csv)).pipe(
            Effect.mapError(
              ({ column, problem }) =>
                new ImportUnreadable({
                  column: Option.getOrNull(column),
                  problem,
                })
            )
          );

          // Each row that could be read, as a post to send or the reason it
          // cannot be; none for a row that could not.
          const read = yield* Effect.all(
            rows.map(({ post, row }) =>
              Result.match(post, {
                onFailure: () => Effect.succeed(Option.none<ReadPost>()),
                onSuccess: (written) =>
                  readPost(
                    newPostOf(written),
                    keyAt(
                      Option.getOrUndefined(written.idempotencyKey),
                      headers["idempotency-key"],
                      "import",
                      row
                    )
                  ).pipe(Effect.asSome),
              })
            )
          );

          const sendable = read.flatMap((post) =>
            Option.isSome(post) && Result.isSuccess(post.value)
              ? [post.value.success]
              : []
          );

          const failures = {
            DatabaseError: Effect.die,
            MissingPermission: forbidden,
          } as const;

          // The whole file is checked before its first post is made.
          const checked = yield* batches
            .check(actor, sendable)
            .pipe(Effect.catchTags(failures));

          // A row its key already made has nothing to check, and one
          // whose key came with another row is refused as `send` would.
          const toRefusal = refusalOfCheck(limitReached);

          const refusals = yield* Effect.all(
            checked.map((found) =>
              Match.valueTags(found, {
                checked: ({ check }) => toRefusal(check),
                keyReused: () =>
                  Effect.succeed(
                    Option.some<PostRefusal>(new IdempotencyKeyReused())
                  ),
                made: () => Effect.succeed(Option.none<PostRefusal>()),
              })
            )
          );

          const allValid =
            sendable.length === rows.length && refusals.every(Option.isNone);

          if (payload.dryRun === true || !allValid) {
            let next = 0;

            const results = rows.map(({ post, row }, at): ImportRowResult => {
              const decoded = read[at] ?? Option.none();

              if (Result.isFailure(post) || Option.isNone(decoded)) {
                return {
                  _tag: "unreadable",
                  problems: Result.isFailure(post) ? [...post.failure] : [],
                  row,
                };
              }

              if (Result.isFailure(decoded.value)) {
                return {
                  _tag: "refused",
                  refusal: decoded.value.failure,
                  row,
                };
              }

              const refusal = refusals[next] ?? Option.none();

              next += 1;

              return Option.match(refusal, {
                onNone: () => ({ _tag: "valid", row }),
                onSome: (found) => ({ _tag: "refused", refusal: found, row }),
              });
            });

            return {
              created: 0,
              dryRun: payload.dryRun === true,
              rows: yield* Effect.all(
                results.map((result) => toldRefusal(result))
              ),
            };
          }

          const answered = yield* sendRead(
            batches,
            limitReached,
            actor,
            sendable.map((request) => Result.succeed(request))
          ).pipe(Effect.catchTags(failures));

          const results = answered.map((outcome, at): ImportRowResult => {
            const row = rows[at]?.row ?? at + 1;

            return Result.match(outcome, {
              onFailure: (refusal) => ({ _tag: "refused", refusal, row }),
              onSuccess: (sent) => ({
                _tag: "created",
                post: postView(sent),
                replayed: sent.replayed,
                row,
              }),
            });
          });

          return {
            created: results.filter(({ _tag }) => _tag === "created").length,
            dryRun: false,
            rows: yield* Effect.all(
              results.map((result) => toldRefusal(result))
            ),
          };
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
      search: ({ query }) =>
        Effect.gen(function* search() {
          const actor = actorOf(yield* CurrentMember);
          const request = searchRequestFrom(query);

          const page = yield* searching.search(actor, request).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              InvalidCursor: () => Effect.fail(new HttpApiError.BadRequest()),
              InvalidTimeRange: () => Effect.fail(new InvalidTimeRange()),
              MissingPermission: forbidden,
            })
          );

          return pageView(page);
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

          return yield* toValidation(check, read);
        }),
    });
  })
);
