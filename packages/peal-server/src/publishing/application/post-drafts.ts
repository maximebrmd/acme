import { Context, Effect, Layer, Option } from "effect";

import type { ChannelOptions } from "#publishing/domain/channel-options.ts";
import { checkDraft } from "#publishing/domain/content-rules.ts";
import type { InvalidPostTransition } from "#publishing/domain/invalid-post-transition.ts";
import type { PostContentRejected } from "#publishing/domain/post-content-rejected.ts";
import { PostContent } from "#publishing/domain/post-content.ts";
import {
  authorOf,
  createDraft,
  discardDraft,
  editDraft,
  mayDiscard,
  tagPost,
} from "#publishing/domain/post.ts";
import type { TagId } from "#publishing/domain/tag-id.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { newId } from "#shared/application/ids.ts";
import type { Ids } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import { can } from "#shared/domain/access.ts";
import type { Actor, Permission } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import { PostIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId, PostId } from "#shared/domain/ids.ts";
import { MissingPermission } from "#shared/domain/missing-permission.ts";

import { ApprovalGate } from "./approval-gate.ts";
import { AttachableMedia } from "./attachable-media.ts";
import type { PostNotFound } from "./post-not-found.ts";
import { PostOrigins } from "./post-origins.ts";
import { channelsFor, mediaFor, tagsFor } from "./post-references.ts";
import { PostRepository } from "./post-repository.ts";
import type { PostWithTargets } from "./post-repository.ts";
import { TagStore } from "./tag-store.ts";
import type { UnknownChannels } from "./unknown-channels.ts";
import type { UnknownMedia } from "./unknown-media.ts";
import type { UnknownTags } from "./unknown-tags.ts";
import { WorkspaceChannels } from "./workspace-channels.ts";
import {
  findInWorkspace,
  lockInWorkspace,
  optionsOfTargets,
  targetsOn,
} from "./workspace-posts.ts";

/**
 * What a draft says, the channels it is meant for so far, and the options
 * it has on some of them, unfinished as they may be.
 */
export interface DraftRequest {
  // Possibly none yet; a channel listed twice gets one target.
  readonly channelIds: readonly ChannelId[];
  readonly content: PostContent;
  // One at most per channel; left out, none on any channel.
  readonly options?: readonly ChannelOptions[];
  /**
   * The workspace's tags it is filed under. Left out, a new draft has
   * none, and a draft that is changed keeps its own.
   */
  readonly tagIds?: readonly TagId[];
}

type DraftFailure =
  | DatabaseError
  | MissingPermission
  | PostContentRejected
  | UnknownChannels
  | UnknownMedia
  | UnknownTags;

type Ports =
  | AttachableMedia
  | Ids
  | PostOrigins
  | PostRepository
  | TagStore
  | WorkspaceChannels;

const applied = (written: boolean) =>
  written ? Effect.void : Effect.die("A post changed under its row lock");

/**
 * Writing posts before they are scheduled. A draft's channels must be the
 * workspace's and its media one it may show, but its text is only checked
 * against the platforms' limits once it is scheduled, so the user can work
 * on it in the meantime.
 *
 * Creating a draft needs post:create, changing one post:update; both read
 * the workspace's channels, which needs channel:read. Its creator is its
 * author, and it keeps how they reached Peal (`PostOrigins`). Discarding a draft deletes it, and needs post:delete, unless the
 * actor is its author and has post:update (`mayDiscard`).
 */
export class PostDrafts extends Context.Service<
  PostDrafts,
  {
    readonly create: (
      actor: Actor,
      request: DraftRequest
    ) => Effect.Effect<PostWithTargets, DraftFailure>;
    /** Replaces a draft's content, channels and options. */
    readonly update: (
      actor: Actor,
      postId: PostId,
      request: DraftRequest
    ) => Effect.Effect<
      PostWithTargets,
      DraftFailure | InvalidPostTransition | PostNotFound
    >;
    /**
     * Makes a new draft that says what a post says, whatever that post's
     * status: its text, its media, its channels with their options, and its
     * tags. What the workspace no longer has is left out rather than
     * refused (a channel disconnected since, media deleted, a tag deleted),
     * with the text the post had on such a channel. The copy has no time,
     * and its author is whoever made it.
     */
    readonly duplicate: (
      actor: Actor,
      postId: PostId
    ) => Effect.Effect<
      PostWithTargets,
      DatabaseError | MissingPermission | PostContentRejected | PostNotFound
    >;
    /** Deletes a draft. A post scheduled or sent is not a draft. */
    readonly discard: (
      actor: Actor,
      postId: PostId
    ) => Effect.Effect<
      void,
      DatabaseError | InvalidPostTransition | MissingPermission | PostNotFound
    >;
  }
>()("peal-server/publishing/application/PostDrafts") {
  static readonly layer = Layer.effect(
    PostDrafts,
    Effect.gen(function* PostDraftsLive() {
      const posts = yield* PostRepository;
      const gate = yield* ApprovalGate;
      const { transaction } = yield* TransactionRunner;
      const ports = yield* Effect.context<Ports>();

      const withPorts = Effect.provideContext(ports);

      // The draft's channels, once its content and options may go to them.
      const checked = Effect.fn("PostDrafts.checked")(function* checked(
        actor: Actor,
        permission: Permission,
        { channelIds, content, options = [] }: DraftRequest
      ) {
        yield* Effect.fromResult(authorize(actor, permission));

        const channels = yield* channelsFor(actor, channelIds);

        yield* Effect.fromResult(checkDraft(content, channels, options));
        yield* mediaFor(actor, content);

        return channels.map(({ channelId }) => channelId);
      }, withPorts);

      // The tags a request names, once they are the workspace's.
      const tagsOf = (actor: Actor, { tagIds }: DraftRequest) =>
        tagIds === undefined
          ? Effect.succeed(Option.none<readonly TagId[]>())
          : tagsFor(actor.workspaceId, tagIds).pipe(
              Effect.map(Option.some),
              withPorts
            );

      const create = Effect.fn("PostDrafts.create")(function* create(
        actor: Actor,
        request: DraftRequest
      ) {
        const channels = yield* checked(actor, "post:create", request);
        const tags = yield* tagsOf(actor, request);
        const postId = yield* newId(PostIdSchema).pipe(withPorts);

        const via = yield* PostOrigins.use((origins) => origins.of(actor)).pipe(
          withPorts
        );

        const post = tagPost(
          createDraft(
            postId,
            actor.workspaceId,
            request.content,
            authorOf(actor),
            Option.some(via)
          ),
          Option.getOrElse(tags, () => [])
        );

        const targets = yield* targetsOn(
          postId,
          channels,
          [],
          Option.some(request.options ?? [])
        ).pipe(withPorts);

        yield* transaction(posts.insert(post, targets));

        return { post, targets };
      });

      const update = Effect.fn("PostDrafts.update")(function* update(
        actor: Actor,
        postId: PostId,
        request: DraftRequest
      ) {
        const channels = yield* checked(actor, "post:update", request);
        const tags = yield* tagsOf(actor, request);

        return yield* transaction(
          Effect.gen(function* edit() {
            const current = yield* lockInWorkspace(
              actor.workspaceId,
              postId
            ).pipe(withPorts);

            const edited = yield* Effect.fromResult(
              editDraft(current.post, request.content)
            );

            const post = Option.match(tags, {
              onNone: () => edited,
              onSome: (chosen) => tagPost(edited, chosen),
            });

            const targets = yield* targetsOn(
              postId,
              channels,
              yield* posts.lockTargets(postId),
              Option.some(request.options ?? [])
            ).pipe(withPorts);

            yield* applied(yield* posts.update(post, current.post));
            yield* posts.setTargets(postId, targets);

            if (Option.isSome(tags)) {
              yield* posts.setTags(postId, tags.value);
            }

            return { post, targets };
          })
        );
      });

      const duplicate = Effect.fn("PostDrafts.duplicate")(function* duplicate(
        actor: Actor,
        postId: PostId
      ) {
        yield* Effect.fromResult(authorize(actor, "post:read"));
        yield* Effect.fromResult(authorize(actor, "post:create"));

        const { post } = yield* findInWorkspace(actor.workspaceId, postId).pipe(
          withPorts
        );

        const targets = yield* posts.targets(postId);
        const { content } = post;

        // What the workspace still has of what the post refers to.
        const refers = Effect.gen(function* stillThere() {
          const channels = yield* WorkspaceChannels.use((workspace) =>
            workspace.lookUp(
              actor,
              targets.map(({ channelId }) => channelId)
            )
          );

          const media =
            content.media.length === 0
              ? []
              : yield* AttachableMedia.use((attachable) =>
                  attachable.lookUp(
                    actor,
                    content.media.map(({ mediaId }) => mediaId)
                  )
                );

          const tags = yield* TagStore.use((store) =>
            store.list(actor.workspaceId)
          );

          return {
            channelIds: channels.map(({ channelId }) => channelId),
            mediaIds: new Set<string>(media.map(({ mediaId }) => mediaId)),
            tagIds: new Set<string>(tags.map(({ id }) => id)),
          };
        }).pipe(withPorts);

        const { channelIds, mediaIds, tagIds } = yield* refers;

        return yield* create(actor, {
          channelIds,
          content: new PostContent({
            media: content.media.filter(({ mediaId }) => mediaIds.has(mediaId)),
            overrides: content.overrides.filter(({ channelId }) =>
              channelIds.includes(channelId)
            ),
            text: content.text,
          }),
          options: optionsOfTargets(targets, channelIds),
          tagIds: post.tagIds.filter((tagId) => tagIds.has(tagId)),
        }).pipe(
          // Checked a moment ago: gone since, they are the server's to
          // answer for, not the request's.
          Effect.catchTags({
            UnknownChannels: Effect.die,
            UnknownMedia: Effect.die,
            UnknownTags: Effect.die,
          })
        );
      });

      const discard = Effect.fn("PostDrafts.discard")(function* discard(
        actor: Actor,
        postId: PostId
      ) {
        // Neither right: no draft can be the actor's to discard.
        if (!can(actor, "post:delete") && !can(actor, "post:update")) {
          return yield* new MissingPermission({ permission: "post:delete" });
        }

        return yield* transaction(
          Effect.gen(function* remove() {
            const current = yield* lockInWorkspace(
              actor.workspaceId,
              postId
            ).pipe(withPorts);

            if (!mayDiscard(actor, current.post)) {
              return yield* new MissingPermission({
                permission: "post:delete",
              });
            }

            yield* Effect.fromResult(discardDraft(current.post));
            yield* posts.remove(postId);

            // What was said of it in review goes with it.
            return yield* gate.forgotten(actor.workspaceId, postId);
          })
        );
      });

      return PostDrafts.of({ create, discard, duplicate, update });
    })
  );
}
