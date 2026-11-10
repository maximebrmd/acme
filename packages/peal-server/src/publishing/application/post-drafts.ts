import { Context, Effect, Layer, Option } from "effect";

import type { ChannelOptions } from "#publishing/domain/channel-options.ts";
import { checkDraft } from "#publishing/domain/content-rules.ts";
import type { InvalidPostTransition } from "#publishing/domain/invalid-post-transition.ts";
import type { PostContentRejected } from "#publishing/domain/post-content-rejected.ts";
import type { PostContent } from "#publishing/domain/post-content.ts";
import {
  authorOf,
  createDraft,
  discardDraft,
  editDraft,
  mayDiscard,
} from "#publishing/domain/post.ts";
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
import type { AttachableMedia } from "./attachable-media.ts";
import type { PostNotFound } from "./post-not-found.ts";
import { PostOrigins } from "./post-origins.ts";
import { channelsFor, mediaFor } from "./post-references.ts";
import { PostRepository } from "./post-repository.ts";
import type { PostWithTargets } from "./post-repository.ts";
import type { UnknownChannels } from "./unknown-channels.ts";
import type { UnknownMedia } from "./unknown-media.ts";
import type { WorkspaceChannels } from "./workspace-channels.ts";
import { lockInWorkspace, targetsOn } from "./workspace-posts.ts";

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
}

type DraftFailure =
  | DatabaseError
  | MissingPermission
  | PostContentRejected
  | UnknownChannels
  | UnknownMedia;

type Ports =
  | AttachableMedia
  | Ids
  | PostOrigins
  | PostRepository
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

      const create = Effect.fn("PostDrafts.create")(function* create(
        actor: Actor,
        request: DraftRequest
      ) {
        const channels = yield* checked(actor, "post:create", request);
        const postId = yield* newId(PostIdSchema).pipe(withPorts);

        const via = yield* PostOrigins.use((origins) => origins.of(actor)).pipe(
          withPorts
        );

        const post = createDraft(
          postId,
          actor.workspaceId,
          request.content,
          authorOf(actor),
          Option.some(via)
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

        return yield* transaction(
          Effect.gen(function* edit() {
            const current = yield* lockInWorkspace(
              actor.workspaceId,
              postId
            ).pipe(withPorts);

            const post = yield* Effect.fromResult(
              editDraft(current.post, request.content)
            );

            const targets = yield* targetsOn(
              postId,
              channels,
              yield* posts.lockTargets(postId),
              Option.some(request.options ?? [])
            ).pipe(withPorts);

            yield* applied(yield* posts.update(post, current.post));
            yield* posts.setTargets(postId, targets);

            return { post, targets };
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

      return PostDrafts.of({ create, discard, update });
    })
  );
}
