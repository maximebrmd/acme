import { Effect, Option } from "effect";
import { CurrentMember, defaultDraftPageSize } from "peal-contract";
import type { ChannelOptions as ChannelOptionsInput } from "peal-contract";

import { PostTools } from "#app/mcp/posts-tools.ts";
import { notAllowed, refuse } from "#app/mcp/refusals.ts";
import {
  channelIdsFrom,
  contentFrom,
  optionsFrom,
  postIdFrom,
  postIdOption,
  targetIdFrom,
} from "#publishing/api/post-input.ts";
import { postView } from "#publishing/api/post-view.ts";
import { tiktokAccountView } from "#publishing/api/tiktok-account-view.ts";
import { PostDrafts } from "#publishing/application/post-drafts.ts";
import { PostFollowUp } from "#publishing/application/post-follow-up.ts";
import type { Confirmation } from "#publishing/application/post-follow-up.ts";
import { PostQueries } from "#publishing/application/post-queries.ts";
import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import { TikTokCreatorInfo } from "#publishing/application/tiktok-creator-info.ts";
import { ChannelOptions } from "#publishing/domain/channel-options.ts";
import { ownRefusalCodes } from "#publishing/domain/own-refusals.ts";
import { actorOf } from "#shared/api/actor.ts";
import type { Actor } from "#shared/domain/access.ts";
import type { ChannelId, PostId } from "#shared/domain/ids.ts";

// What the use cases' refusals tell the user, through their MCP client.

const notFound = () => refuse("The workspace has no post with this id.");

const postConflict = ({ from }: { readonly from: string }) =>
  refuse(`The post is ${from}, which does not allow this.`);

const targetConflict = ({ from }: { readonly from: string }) =>
  refuse(
    `The post is ${from} on that channel: only a failed or unconfirmed post is reposted, and only an unconfirmed one confirmed.`
  );

// A violation as the user reads it: what, on which channel, and which
// option field.
const violationText = (violation: {
  readonly _tag: string;
  readonly channelId?: string;
  readonly field?: string;
}) => {
  const where =
    violation.channelId === undefined ? "" : ` on ${violation.channelId}`;

  const field = violation.field === undefined ? "" : ` (${violation.field})`;

  return `${violation._tag}${field}${where}`;
};

const contentRejected = ({
  violations,
}: {
  readonly violations: readonly {
    readonly _tag: string;
    readonly channelId?: string;
    readonly field?: string;
  }[];
}) =>
  refuse(
    `The content cannot be saved: ${[...new Set(violations.map(violationText))].join(", ")}.`
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
    const tiktok = yield* TikTokCreatorInfo;

    const actor = CurrentMember.pipe(Effect.map(actorOf));

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
      create_draft: ({ channelIds, content, options }) =>
        Effect.gen(function* create() {
          const given = yield* givenOptions(options);

          const created = yield* drafts
            .create(yield* actor, {
              channelIds: yield* channelIdsFrom(channelIds),
              content: yield* contentFrom(content),
              options: Option.getOrElse(given, () => []),
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
      get_tiktok_creator: ({ channelId }) =>
        actor.pipe(
          Effect.flatMap((member) => tiktok.read(member, channelId)),
          Effect.map(tiktokAccountView),
          Effect.catchTags({
            BadRequest: ({ code }) =>
              code === ownRefusalCodes.channelDisabled
                ? refuse(
                    "This channel is turned off: the user disconnects it and connects the account again to post to it."
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
      update_draft: ({ channelIds, content, options, postId }) =>
        Effect.gen(function* update() {
          const id = yield* postIdFrom(postId);
          const channels = yield* channelIdsFrom(channelIds);
          const given = yield* givenOptions(options);

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
