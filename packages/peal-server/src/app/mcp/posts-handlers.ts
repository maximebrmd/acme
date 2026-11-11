import {
  Array as Arr,
  DateTime,
  Duration,
  Effect,
  Option,
  Result,
} from "effect";
import {
  CurrentMember,
  defaultDraftPageSize,
  duplicateWindowHours,
} from "peal-contract";
import type {
  BulkPostResult,
  ChannelOptions as ChannelOptionsInput,
  PostTiming,
} from "peal-contract";

import { PostTools } from "#app/mcp/posts-tools.ts";
import type { ToolTiming } from "#app/mcp/posts-tools.ts";
import { queueReferenced } from "#app/mcp/queue-reference.ts";
import {
  livePostRefusals,
  notAllowed,
  planRefusal,
  presetRefusals,
  queueHasNoRoom,
  unknownQueue,
  refuse,
  unknownSignature,
  unknownTags,
} from "#app/mcp/refusals.ts";
import type { ToolRefused } from "#app/mcp/tool-refused.ts";
import {
  livePostChangeView,
  postUnpublishView,
} from "#publishing/api/live-post-change-view.ts";
import { keyAt, readPost, sendRead } from "#publishing/api/post-batch.ts";
import { checkRequestFrom } from "#publishing/api/post-check-input.ts";
import { validationOf } from "#publishing/api/post-check-view.ts";
import {
  channelIdsFrom,
  contentFrom,
  draftTagsFrom,
  optionsFrom,
  postIdFrom,
  postIdOption,
  presetsFrom,
  scheduleFrom,
  sendRequestFrom,
  targetIdFrom,
} from "#publishing/api/post-input.ts";
import { toldRefusal } from "#publishing/api/post-refusal.ts";
import { pageView, searchRequestFrom } from "#publishing/api/post-search.ts";
import { attemptView, postView } from "#publishing/api/post-view.ts";
import { reshuffleView } from "#publishing/api/queue-view.ts";
import { tiktokAccountView } from "#publishing/api/tiktok-account-view.ts";
import { LivePostChanges } from "#publishing/application/live-post-changes.ts";
import { PostBatches } from "#publishing/application/post-batches.ts";
import { PostChecks } from "#publishing/application/post-checks.ts";
import { PostDrafts } from "#publishing/application/post-drafts.ts";
import { PostFollowUp } from "#publishing/application/post-follow-up.ts";
import type { Confirmation } from "#publishing/application/post-follow-up.ts";
import { PostOutcomes } from "#publishing/application/post-outcomes.ts";
import { PostQueries } from "#publishing/application/post-queries.ts";
import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import { PostSearch } from "#publishing/application/post-search.ts";
import { Queues } from "#publishing/application/queues.ts";
import { TikTokCreatorInfo } from "#publishing/application/tiktok-creator-info.ts";
import { ChannelOptions } from "#publishing/domain/channel-options.ts";
import { ownRefusalCodes } from "#publishing/domain/own-refusals.ts";
import { queueKeyOf } from "#publishing/domain/queue.ts";
import { actorOf } from "#shared/api/actor.ts";
import { limitRefusal } from "#shared/api/limit-reached.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { ChannelId, PostId } from "#shared/domain/ids.ts";
import type { PlanLimitReached } from "#shared/domain/plan-limit-reached.ts";

// What the use cases' refusals tell the user, through their MCP client.

const notFound = () => refuse("The workspace has no post with this id.");

const postConflict = ({ from }: { readonly from: string }) =>
  refuse(`The post is ${from}, which does not allow this.`);

const targetConflict = ({ from }: { readonly from: string }) =>
  refuse(
    `The post is ${from} on that channel: only a failed or unconfirmed post is reposted, and only an unconfirmed one confirmed.`
  );

// Every violation, as data a model fixes the post from: each names what is
// wrong (`_tag`), on which channel and platform, and its field, media or
// limit.
const contentRejected = ({
  violations,
}: {
  readonly violations: readonly { readonly _tag: string }[];
}) =>
  refuse(
    `The post was refused, and nothing was saved, scheduled or published. It has ${String(violations.length)} violation${violations.length === 1 ? "" : "s"} of the platforms' rules; fix every one, then call again: ${JSON.stringify(violations)}`
  );

const inPast = () =>
  refuse(
    "This time has passed: nothing was scheduled. Give an instant in the future, or publish now."
  );

const invalidTimeZone = ({ timeZone }: { readonly timeZone: string }) =>
  refuse(
    `"${timeZone}" is not an IANA time zone, such as Europe/Paris or America/New_York: offsets and abbreviations are not taken. Nothing was scheduled.`
  );

const unknownChannels = ({
  channelIds,
}: {
  readonly channelIds: readonly string[];
}) =>
  refuse(
    `These channels are not the workspace's: ${channelIds.join(", ")}. list_channels answers its channels.`
  );

const unknownMedia = ({ mediaIds }: { readonly mediaIds: readonly string[] }) =>
  refuse(
    `These media are not the workspace's, or not ready: ${mediaIds.join(", ")}.`
  );

// Ids that are not even of the right form name nothing.
const malformedPost = { PostNotFound: notFound } as const;

const malformedContent = {
  UnknownChannels: unknownChannels,
  UnknownMedia: unknownMedia,
} as const;

const notTikTok = () =>
  refuse(
    "This is not one of the workspace's TikTok channels: list_channels answers them."
  );

const tiktokUnreachable = () =>
  refuse(
    "TikTok did not answer, or asked to slow down: try again in a few minutes."
  );

// The options a request gives, decoded: `undefined` when it gives none.
const givenOptions = (input: readonly ChannelOptionsInput[] | undefined) =>
  input === undefined
    ? Effect.succeed(Option.none<readonly ChannelOptions[]>())
    : optionsFrom(input).pipe(Effect.map(Option.some));

/** What the post tools do, through the publishing context's use cases. */
export const PostToolsLive = PostTools.toLayer(
  Effect.gen(function* postTools() {
    const drafts = yield* PostDrafts;
    const followUp = yield* PostFollowUp;
    const queries = yield* PostQueries;
    const scheduling = yield* PostScheduling;
    const batches = yield* PostBatches;
    const checks = yield* PostChecks;
    const outcomes = yield* PostOutcomes;
    const searching = yield* PostSearch;
    const limitReached = yield* limitRefusal;
    const toValidation = validationOf(limitReached);
    const refusedByPlan = yield* planRefusal;
    const tiktok = yield* TikTokCreatorInfo;

    const actor = CurrentMember.pipe(Effect.map(actorOf));
    const live = yield* LivePostChanges;
    const queues = yield* Queues;

    // A post's time as the API takes it: a queue named by its id or its
    // name, found among the workspace's, or a refusal saying which.
    const timingOf = (
      member: Actor,
      given: ToolTiming
    ): Effect.Effect<PostTiming, ToolRefused, CurrentMember> =>
      given._tag === "queue"
        ? queueReferenced(queues, member, given.queue).pipe(
            Effect.map(({ queue }): PostTiming => ({
              _tag: "queue",
              queueId: queue.id,
            }))
          )
        : Effect.succeed(given);

    // The same for posts of one call, each refused on its own: a queue
    // named by a name the workspace lacks is left for the API to refuse.
    const timingsOf = Effect.fn("mcp.timingsOf")(function* timingsOf(
      member: Actor,
      given: readonly ToolTiming[]
    ) {
      const kept = given.some(({ _tag }) => _tag === "queue")
        ? yield* queues.list(member).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: notAllowed("read queues"),
            })
          )
        : [];

      return given.map((timing): PostTiming => {
        if (timing._tag !== "queue") {
          return timing;
        }

        const wanted = timing.queue?.trim() ?? "";

        const found =
          wanted === ""
            ? kept.find(({ queue }) => queue.isDefault)
            : (kept.find(({ queue }) => queue.id === wanted) ??
              kept.find(
                ({ queue }) => queueKeyOf(queue.name) === queueKeyOf(wanted)
              ));

        if (found !== undefined) {
          return { _tag: "queue", queueId: found.queue.id };
        }

        return wanted === ""
          ? { _tag: "queue" }
          : { _tag: "queue", queueId: wanted };
      });
    });

    // The options a draft has on those of `channels` it is for already.
    const keptOptions = Effect.fn("keptOptions")(function* keptOptions(
      member: Actor,
      postId: PostId,
      channels: readonly ChannelId[]
    ) {
      const found = yield* queries.get(member, postId).pipe(
        Effect.catchTags({
          DatabaseError: Effect.die,
          MissingPermission: notAllowed("read posts"),
          PostNotFound: notFound,
        })
      );

      return found.targets.flatMap((target) =>
        Option.isSome(target.options) && channels.includes(target.channelId)
          ? [
              new ChannelOptions({
                channelId: target.channelId,
                options: target.options.value,
              }),
            ]
          : []
      );
    });

    const followUpFailures = {
      DatabaseError: Effect.die,
      InvalidPostTransition: postConflict,
      InvalidTargetTransition: targetConflict,
      MissingPermission: notAllowed("follow up on posts"),
      PostNotFound: notFound,
    } as const;

    const unpublishFailures = {
      DatabaseError: Effect.die,
      MissingPermission: notAllowed("remove posts from their platforms"),
      PostNotFound: notFound,
    } as const;

    // The target of the post on the channel named, by the channel's id or
    // the target's: a channel the post is not on is refused.
    const targetNamed = Effect.fn("UnpublishPost.targetNamed")(
      function* targetNamed(
        member: Actor,
        id: PostId,
        named: {
          readonly channelId: string | undefined;
          readonly targetId: string | undefined;
        }
      ) {
        const { targets } = yield* queries.get(member, id).pipe(
          Effect.catchTags({
            DatabaseError: Effect.die,
            MissingPermission: notAllowed("read posts"),
            PostNotFound: notFound,
          })
        );

        const found = targets.find(
          (target) =>
            target.id === named.targetId || target.channelId === named.channelId
        );

        return found === undefined
          ? yield* refuse(
              "The post is not on that channel: get_post answers its targets and their channels."
            )
          : found.id;
      }
    );

    // The member, once they may decide what goes out: said before anything
    // else about the post is.
    const publisher = actor.pipe(
      Effect.tap((member) =>
        Effect.fromResult(authorize(member, "post:schedule")).pipe(
          Effect.catchTag(
            "MissingPermission",
            notAllowed("schedule or publish posts")
          )
        )
      )
    );

    // The plan has no room for the post, or the workspace holds more than
    // it allows: what it allows and holds, and the way out.
    const planLimit = (reached: PlanLimitReached) =>
      actor.pipe(
        Effect.flatMap(({ workspaceId }) =>
          refusedByPlan(
            workspaceId,
            "Nothing was scheduled or published."
          )(reached)
        )
      );

    // What keeps a new post from being scheduled.
    const newPostFailures = {
      DatabaseError: Effect.die,
      MissingPermission: notAllowed("schedule or publish posts"),
      PlanLimitReached: planLimit,
      PostContentRejected: contentRejected,
      ScheduleInPast: inPast,
      UnknownChannels: unknownChannels,
      UnknownMedia: unknownMedia,
    } as const;

    // And one the workspace has already.
    const schedulingFailures = {
      ...newPostFailures,
      InvalidPostTransition: postConflict,
      PostNotFound: notFound,
    } as const;

    const badZone = { InvalidTimeZone: invalidTimeZone } as const;

    const awaitFailures = {
      DatabaseError: Effect.die,
      MissingPermission: notAllowed("read posts"),
      PostNotFound: notFound,
    } as const;

    return PostTools.of({
      await_post: ({ postId, waitSeconds = 0 }) =>
        Effect.gen(function* awaitPost() {
          const awaited = yield* outcomes
            .await(
              yield* actor,
              yield* postIdFrom(postId),
              Duration.seconds(waitSeconds)
            )
            .pipe(Effect.catchTags(awaitFailures));

          return postView(awaited);
        }).pipe(Effect.catchTags(malformedPost)),
      cancel_post: ({ postId }) =>
        Effect.gen(function* cancel() {
          const cancelled = yield* scheduling
            .cancel(yield* actor, yield* postIdFrom(postId))
            .pipe(
              Effect.catchTags({
                DatabaseError: Effect.die,
                InvalidPostTransition: postConflict,
                MissingPermission: notAllowed("cancel posts"),
                PostNotFound: notFound,
              })
            );

          return postView(cancelled);
        }).pipe(Effect.catchTags(malformedPost)),
      confirm_target: ({ confirmation, postId, targetId }) =>
        Effect.gen(function* confirm() {
          const post = yield* postIdFrom(postId);
          const target = yield* targetIdFrom(targetId);

          const found: Confirmation =
            confirmation._tag === "published"
              ? {
                  _tag: "published",
                  permalink: Option.fromNullOr(confirmation.permalink),
                }
              : { _tag: "notPublished" };

          const confirmed = yield* followUp
            .confirm(yield* actor, post, target, found)
            .pipe(Effect.catchTags(followUpFailures));

          return postView(confirmed);
        }).pipe(Effect.catchTags(malformedPost)),
      create_draft: ({ channelIds, content, options, tagIds, ...saved }) =>
        Effect.gen(function* create() {
          const given = yield* givenOptions(options);
          const tags = yield* draftTagsFrom(tagIds);

          const created = yield* drafts
            .create(yield* actor, {
              channelIds: yield* channelIdsFrom(channelIds),
              content: yield* contentFrom(content),
              options: Option.getOrElse(given, () => []),
              presets: yield* presetsFrom(saved),
              ...tags,
            })
            .pipe(
              Effect.catchTags({
                ...presetRefusals,
                DatabaseError: Effect.die,
                MissingPermission: notAllowed("write drafts"),
                PostContentRejected: contentRejected,
                UnknownChannels: unknownChannels,
                UnknownMedia: unknownMedia,
                UnknownTags: unknownTags,
              })
            );

          return postView(created);
        }).pipe(
          Effect.catchTags({
            ...malformedContent,
            SignatureNotFound: unknownSignature,
            UnknownTags: unknownTags,
          })
        ),
      create_post: ({ idempotencyKey, waitSeconds = 0, ...post }) =>
        Effect.gen(function* createPost() {
          const request = yield* sendRequestFrom(
            { ...post, when: yield* timingOf(yield* actor, post.when) },
            idempotencyKey
          );

          const sent = yield* scheduling.send(yield* actor, request).pipe(
            Effect.catchTags({
              ...presetRefusals,
              ...newPostFailures,
              DuplicateContent: ({ duplicates }) =>
                refuse(
                  `The same content already goes to ${duplicates
                    .map(
                      ({ channelId, postId }) =>
                        `channel ${channelId} (post ${postId})`
                    )
                    .join(
                      ", "
                    )}, less than ${String(duplicateWindowHours)} hours from this post's time: nothing was made. If the first call's answer was lost, that post is the one it made: read it with get_post. Call again with allowDuplicate: true only when the user means to post the same content twice.`
                ),
              IdempotencyKeyReused: () =>
                refuse(
                  "This idempotencyKey was used in the last 24 hours with other arguments: nothing was made. Call again with the first call's exact arguments to get its post, or with a new key for a new post."
                ),
              PostNotFound: () =>
                refuse(
                  "The post this idempotencyKey made was deleted since: nothing was made. Use a new key to make it again."
                ),
              QueueHasNoRoom: queueHasNoRoom,
              QueueNotFound: unknownQueue,
              UnknownTags: unknownTags,
            })
          );

          // Never a refusal, now that the post is made.
          const awaited = yield* outcomes
            .afterSending(yield* actor, sent, Duration.seconds(waitSeconds))
            .pipe(Effect.orDie);

          return postView(awaited);
        }).pipe(
          Effect.catchTags({
            ...malformedContent,
            ...badZone,
            QueueNotFound: unknownQueue,
            SignatureNotFound: unknownSignature,
            UnknownTags: unknownTags,
          })
        ),
      create_posts: ({ idempotencyKey, posts }) =>
        Effect.gen(function* createPosts() {
          const timings = yield* timingsOf(
            yield* actor,
            posts.map(({ when }) => when)
          );

          const read = yield* Effect.all(
            posts.map(({ idempotencyKey: own, ...post }, index) =>
              readPost(
                { ...post, when: timings[index] ?? { _tag: "queue" } },
                keyAt(own, idempotencyKey, "bulk", index)
              )
            )
          );

          const answered = yield* sendRead(
            batches,
            limitReached,
            yield* actor,
            read
          ).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: notAllowed("schedule or publish posts"),
            })
          );

          // A refused item carries the code the API's error has.
          const items = yield* Effect.all(
            answered.map((outcome, index) =>
              toldRefusal<BulkPostResult>(
                Result.match(outcome, {
                  onFailure: (refusal) => ({ _tag: "refused", index, refusal }),
                  onSuccess: (made) => ({
                    _tag: "created",
                    index,
                    post: postView(made),
                    replayed: made.replayed,
                  }),
                })
              )
            )
          );

          const created = items.filter(({ _tag }) => _tag === "created").length;

          return { created, items, refused: items.length - created };
        }),
      discard_draft: ({ postId }) =>
        Effect.gen(function* discard() {
          yield* drafts.discard(yield* actor, yield* postIdFrom(postId)).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              InvalidPostTransition: postConflict,
              MissingPermission: notAllowed("discard this draft"),
              PostNotFound: notFound,
            })
          );

          return { discarded: postId };
        }).pipe(Effect.catchTags(malformedPost)),
      duplicate_post: ({ postId }) =>
        Effect.gen(function* duplicate() {
          const copy = yield* drafts
            .duplicate(yield* actor, yield* postIdFrom(postId))
            .pipe(
              Effect.catchTags({
                DatabaseError: Effect.die,
                MissingPermission: notAllowed("duplicate posts"),
                PostContentRejected: contentRejected,
                PostNotFound: notFound,
              })
            );

          return postView(copy);
        }).pipe(Effect.catchTags(malformedPost)),
      get_post: ({ postId }) =>
        Effect.gen(function* get() {
          const found = yield* queries
            .get(yield* actor, yield* postIdFrom(postId))
            .pipe(
              Effect.catchTags({
                DatabaseError: Effect.die,
                MissingPermission: notAllowed("read posts"),
                PostNotFound: notFound,
              })
            );

          return postView(found);
        }).pipe(Effect.catchTags(malformedPost)),
      get_tiktok_creator: ({ channelId }) =>
        actor.pipe(
          Effect.flatMap((member) => tiktok.read(member, channelId)),
          Effect.map(tiktokAccountView),
          Effect.catchTags({
            BadRequest: ({ code }) =>
              code === ownRefusalCodes.channelDisabled
                ? refuse(
                    "This channel is turned off: enable_channel turns it back on, to post to it."
                  )
                : notTikTok(),
            DatabaseError: Effect.die,
            MissingPermission: notAllowed("read what a TikTok channel takes"),
            PlatformUnavailable: tiktokUnreachable,
            RateLimited: tiktokUnreachable,
            TokenExpired: () =>
              refuse(
                "The channel must be reconnected, in the web app, before TikTok tells its settings."
              ),
            UnknownChannels: notTikTok,
          })
        ),
      list_drafts: ({ cursor, limit }) =>
        Effect.gen(function* listDrafts() {
          // A cursor is the id of the last draft of the page before.
          const after = Option.fromUndefinedOr(cursor).pipe(
            Option.map(postIdOption)
          );

          if (Option.isSome(after) && Option.isNone(after.value)) {
            return yield* refuse(
              "This cursor is not one list_drafts answered: start again without it."
            );
          }

          const page = yield* queries
            .listDrafts(yield* actor, {
              after: Option.flatten(after),
              limit: limit ?? defaultDraftPageSize,
            })
            .pipe(
              Effect.catchTags({
                DatabaseError: Effect.die,
                MissingPermission: notAllowed("read posts"),
              })
            );

          return {
            items: page.items.map(postView),
            nextCursor: Option.getOrNull(page.next),
          };
        }),
      list_post_attempts: ({ postId }) =>
        Effect.gen(function* attempts() {
          const made = yield* queries
            .attempts(yield* actor, yield* postIdFrom(postId))
            .pipe(
              Effect.catchTags({
                DatabaseError: Effect.die,
                MissingPermission: notAllowed("read posts"),
                PostNotFound: notFound,
              })
            );

          return { attempts: made.map(attemptView) };
        }).pipe(Effect.catchTags(malformedPost)),
      list_post_changes: ({ postId }) =>
        Effect.gen(function* listChanges() {
          const listed = yield* live
            .list(yield* actor, yield* postIdFrom(postId))
            .pipe(
              Effect.catchTags({
                DatabaseError: Effect.die,
                MissingPermission: notAllowed("read posts"),
                PostNotFound: notFound,
              })
            );

          return { items: listed.map(livePostChangeView) };
        }).pipe(Effect.catchTags(malformedPost)),
      list_posts: (query) =>
        Effect.gen(function* listPosts() {
          const page = yield* searching
            .search(yield* actor, searchRequestFrom(query))
            .pipe(
              Effect.catchTags({
                DatabaseError: Effect.die,
                InvalidCursor: () =>
                  refuse(
                    "This cursor is none a page of this list gave: pass a page's nextCursor with the same filters and sort, or leave it out for the first page."
                  ),
                InvalidTimeRange: () => refuse("`from` must be before `to`."),
                MissingPermission: notAllowed("read posts"),
              })
            );

          const { channels, items, nextCursor } = pageView(page);

          return { channels, nextCursor, posts: items };
        }),
      publish_post: ({ postId }) =>
        Effect.gen(function* publish() {
          const id = yield* postIdFrom(postId);
          const member = yield* publisher;

          const found = yield* queries.get(member, id).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: notAllowed("read posts"),
              PostNotFound: notFound,
            })
          );

          // It keeps the zone it was scheduled in, if it was.
          const { status } = found.post;

          const zone =
            status._tag === "scheduled" ? status.schedule.timeZone : "UTC";

          const now = yield* scheduleFrom(yield* DateTime.now, zone);

          const published = yield* scheduling
            .reschedule(member, id, now)
            .pipe(Effect.catchTags(schedulingFailures));

          return postView(published);
        }).pipe(Effect.catchTags({ ...malformedPost, ...badZone })),
      queue_post: ({ channelIds, postId, queue }) =>
        Effect.gen(function* queuePost() {
          const id = yield* postIdFrom(postId);
          const member = yield* publisher;

          const { queue: chosen } = yield* queueReferenced(
            queues,
            member,
            queue
          );

          const named =
            channelIds === undefined ? [] : yield* channelIdsFrom(channelIds);

          const placed = yield* scheduling
            .enqueue(member, id, {
              channelIds: Arr.isReadonlyArrayNonEmpty(named)
                ? Option.some(named)
                : Option.none(),
              queueId: Option.some(chosen.id),
            })
            .pipe(
              Effect.catchTags({
                ...schedulingFailures,
                ChannelSetNotFound: presetRefusals.ChannelSetNotFound,
                QueueHasNoRoom: queueHasNoRoom,
                QueueNotFound: unknownQueue,
              })
            );

          return postView(placed);
        }).pipe(
          Effect.catchTags({
            ...malformedPost,
            UnknownChannels: unknownChannels,
          })
        ),
      repost_target: ({ postId, targetId }) =>
        Effect.gen(function* repost() {
          const reposted = yield* followUp
            .repost(
              yield* actor,
              yield* postIdFrom(postId),
              yield* targetIdFrom(targetId)
            )
            .pipe(Effect.catchTags(followUpFailures));

          return postView(reposted);
        }).pipe(Effect.catchTags(malformedPost)),
      reschedule_post: ({ at, postId, timeZone }) =>
        Effect.gen(function* reschedule() {
          const id = yield* postIdFrom(postId);
          const member = yield* publisher;

          const found = yield* queries.get(member, id).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: notAllowed("read posts"),
              PostNotFound: notFound,
            })
          );

          if (found.post.status._tag === "draft") {
            return yield* refuse(
              "The post is a draft, which has no time to move: schedule it with schedule_post."
            );
          }

          const moved = yield* scheduling
            .reschedule(member, id, yield* scheduleFrom(at, timeZone))
            .pipe(Effect.catchTags(schedulingFailures));

          return postView(moved);
        }).pipe(Effect.catchTags({ ...malformedPost, ...badZone })),
      reshuffle_queue: ({ queue }) =>
        Effect.gen(function* reshuffleQueue() {
          const member = yield* publisher;

          const { queue: chosen } = yield* queueReferenced(
            queues,
            member,
            queue
          );

          const done = yield* scheduling.reshuffle(member, chosen.id).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: notAllowed("schedule or publish posts"),
              QueueHasNoRoom: queueHasNoRoom,
              QueueNotFound: unknownQueue,
            })
          );

          return reshuffleView(done);
        }),
      schedule_post: ({ at, channelIds, postId, timeZone }) =>
        Effect.gen(function* schedule() {
          const id = yield* postIdFrom(postId);
          const member = yield* publisher;
          const when = yield* scheduleFrom(at, timeZone);

          const found = yield* queries.get(member, id).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: notAllowed("read posts"),
              PostNotFound: notFound,
            })
          );

          if (found.post.status._tag !== "draft") {
            return yield* refuse(
              `The post is ${found.post.status._tag}, not a draft: move a scheduled post with reschedule_post, or take it back to draft with unschedule_post first.`
            );
          }

          // On the channels given, or those the draft has.
          const scheduled = yield* (
            channelIds === undefined
              ? scheduling.reschedule(member, id, when)
              : scheduling.scheduleDraft(member, id, {
                  channelIds: yield* channelIdsFrom(channelIds),
                  schedule: when,
                })
          ).pipe(Effect.catchTags(schedulingFailures));

          return postView(scheduled);
        }).pipe(
          Effect.catchTags({
            ...malformedPost,
            ...badZone,
            UnknownChannels: unknownChannels,
          })
        ),
      unpublish_post: ({ channelId, postId, targetId }) =>
        Effect.gen(function* unpublishPost() {
          const member = yield* actor;
          const id = yield* postIdFrom(postId);

          // A channel, or a target, names one channel of the post.
          const onChannel =
            channelId === undefined && targetId === undefined
              ? Option.none()
              : Option.some(
                  yield* targetNamed(member, id, { channelId, targetId })
                );

          if (Option.isNone(onChannel)) {
            const made = yield* live
              .unpublishPost(member, id)
              .pipe(Effect.catchTags(unpublishFailures));

            return postUnpublishView(made);
          }

          const change = yield* live
            .unpublishTarget(member, id, onChannel.value)
            .pipe(
              Effect.catchTags({
                ...unpublishFailures,
                LivePostNotChangeable: ({ reason }) =>
                  refuse(
                    `The post was not removed from that channel: ${livePostRefusals[reason]}.`
                  ),
              })
            );

          return postUnpublishView({ changes: [change], refused: [] });
        }).pipe(Effect.catchTags(malformedPost)),
      unschedule_post: ({ postId }) =>
        Effect.gen(function* unschedule() {
          const draft = yield* scheduling
            .unschedule(yield* actor, yield* postIdFrom(postId))
            .pipe(
              Effect.catchTags({
                DatabaseError: Effect.die,
                InvalidPostTransition: postConflict,
                MissingPermission: notAllowed("unschedule posts"),
                PostNotFound: notFound,
              })
            );

          return postView(draft);
        }).pipe(Effect.catchTags(malformedPost)),
      update_draft: ({
        channelIds,
        content,
        options,
        postId,
        tagIds,
        ...saved
      }) =>
        Effect.gen(function* update() {
          const id = yield* postIdFrom(postId);
          const channels = yield* channelIdsFrom(channelIds);
          const given = yield* givenOptions(options);
          // Without tags, the draft keeps those it has.
          const tags = yield* draftTagsFrom(tagIds);

          // Without options, the draft keeps those it has on the channels
          // it keeps, rather than lose them as the API's update would.
          const kept = Option.isSome(given)
            ? given.value
            : yield* keptOptions(yield* actor, id, channels);

          const updated = yield* drafts
            .update(yield* actor, id, {
              channelIds: channels,
              content: yield* contentFrom(content),
              options: kept,
              presets: yield* presetsFrom(saved),
              ...tags,
            })
            .pipe(
              Effect.catchTags({
                ...presetRefusals,
                DatabaseError: Effect.die,
                InvalidPostTransition: postConflict,
                MissingPermission: notAllowed("change drafts"),
                PostContentRejected: contentRejected,
                PostNotFound: notFound,
                UnknownChannels: unknownChannels,
                UnknownMedia: unknownMedia,
                UnknownTags: unknownTags,
              })
            );

          return postView(updated);
        }).pipe(
          Effect.catchTags({
            ...malformedPost,
            ...malformedContent,
            SignatureNotFound: unknownSignature,
            UnknownTags: unknownTags,
          })
        ),
      validate_post: ({ when, ...post }) =>
        Effect.gen(function* validatePost() {
          const read = yield* checkRequestFrom(
            when === undefined
              ? post
              : { ...post, when: yield* timingOf(yield* actor, when) }
          );

          const check = yield* checks.check(yield* actor, read.request).pipe(
            Effect.catchTags({
              ...presetRefusals,
              DatabaseError: Effect.die,
              MissingPermission: notAllowed("read posts"),
              QueueNotFound: unknownQueue,
            })
          );

          return yield* toValidation(check, read);
        }).pipe(
          Effect.catchTags({
            QueueNotFound: unknownQueue,
            SignatureNotFound: unknownSignature,
          })
        ),
    });
  })
);
