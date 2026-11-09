import { CurrentMember, defaultDraftPageSize } from "acme-contract";
import { Effect, Option } from "effect";

import { PostTools } from "#app/mcp/posts-tools.ts";
import { notAllowed, refuse } from "#app/mcp/refusals.ts";
import {
  channelIdsFrom,
  contentFrom,
  postIdFrom,
  postIdOption,
  targetIdFrom,
} from "#publishing/api/post-input.ts";
import { postView } from "#publishing/api/post-view.ts";
import { PostDrafts } from "#publishing/application/post-drafts.ts";
import { PostFollowUp } from "#publishing/application/post-follow-up.ts";
import type { Confirmation } from "#publishing/application/post-follow-up.ts";
import { PostQueries } from "#publishing/application/post-queries.ts";
import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import { actorOf } from "#shared/api/actor.ts";

// What the use cases' refusals tell the user, through their MCP client.

const notFound = () => refuse("The workspace has no post with this id.");

const postConflict = ({ from }: { readonly from: string }) =>
  refuse(`The post is ${from}, which does not allow this.`);

const targetConflict = ({ from }: { readonly from: string }) =>
  refuse(
    `The post is ${from} on that channel: only a failed or unconfirmed post is reposted, and only an unconfirmed one confirmed.`
  );

const contentRejected = ({
  violations,
}: {
  readonly violations: readonly { readonly _tag: string }[];
}) =>
  refuse(
    `The content cannot be saved: ${[...new Set(violations.map(({ _tag }) => _tag))].join(", ")}.`
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

/** What the post tools do, through the publishing context's use cases. */
export const PostToolsLive = PostTools.toLayer(
  Effect.gen(function* postTools() {
    const drafts = yield* PostDrafts;
    const followUp = yield* PostFollowUp;
    const queries = yield* PostQueries;
    const scheduling = yield* PostScheduling;

    const actor = CurrentMember.pipe(Effect.map(actorOf));

    const followUpFailures = {
      DatabaseError: Effect.die,
      InvalidPostTransition: postConflict,
      InvalidTargetTransition: targetConflict,
      MissingPermission: notAllowed("follow up on posts"),
      PostNotFound: notFound,
    } as const;

    return PostTools.of({
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
      create_draft: ({ channelIds, content }) =>
        Effect.gen(function* create() {
          const created = yield* drafts
            .create(yield* actor, {
              channelIds: yield* channelIdsFrom(channelIds),
              content: yield* contentFrom(content),
            })
            .pipe(
              Effect.catchTags({
                DatabaseError: Effect.die,
                MissingPermission: notAllowed("write drafts"),
                PostContentRejected: contentRejected,
                UnknownChannels: unknownChannels,
                UnknownMedia: unknownMedia,
              })
            );

          return postView(created);
        }).pipe(Effect.catchTags(malformedContent)),
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
      update_draft: ({ channelIds, content, postId }) =>
        Effect.gen(function* update() {
          const updated = yield* drafts
            .update(yield* actor, yield* postIdFrom(postId), {
              channelIds: yield* channelIdsFrom(channelIds),
              content: yield* contentFrom(content),
            })
            .pipe(
              Effect.catchTags({
                DatabaseError: Effect.die,
                InvalidPostTransition: postConflict,
                MissingPermission: notAllowed("change drafts"),
                PostContentRejected: contentRejected,
                PostNotFound: notFound,
                UnknownChannels: unknownChannels,
                UnknownMedia: unknownMedia,
              })
            );

          return postView(updated);
        }).pipe(Effect.catchTags({ ...malformedPost, ...malformedContent })),
    });
  })
);
