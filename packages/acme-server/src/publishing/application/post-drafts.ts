import { Context, Effect, Layer } from "effect";

import { checkDraft } from "#publishing/domain/content-rules.ts";
import type { InvalidPostTransition } from "#publishing/domain/invalid-post-transition.ts";
import type { PostContentRejected } from "#publishing/domain/post-content-rejected.ts";
import type { PostContent } from "#publishing/domain/post-content.ts";
import { createDraft, editDraft } from "#publishing/domain/post.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { newId } from "#shared/application/ids.ts";
import type { Ids } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { Actor, Permission } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import { PostIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId, PostId } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";

import type { AttachableMedia } from "./attachable-media.ts";
import type { PostNotFound } from "./post-not-found.ts";
import { channelsFor, mediaFor } from "./post-references.ts";
import { PostRepository } from "./post-repository.ts";
import type { PostWithTargets } from "./post-repository.ts";
import type { UnknownChannels } from "./unknown-channels.ts";
import type { UnknownMedia } from "./unknown-media.ts";
import type { WorkspaceChannels } from "./workspace-channels.ts";
import { lockInWorkspace, targetsOn } from "./workspace-posts.ts";

/** What a draft says, and the channels it is meant for so far. */
export interface DraftRequest {
  // Possibly none yet; a channel listed twice gets one target.
  readonly channelIds: readonly ChannelId[];
  readonly content: PostContent;
}

type DraftFailure =
  | DatabaseError
  | MissingPermission
  | PostContentRejected
  | UnknownChannels
  | UnknownMedia;

type Ports = AttachableMedia | Ids | PostRepository | WorkspaceChannels;

const applied = (written: boolean) =>
  written ? Effect.void : Effect.die("A post changed under its row lock");

/**
 * Writing posts before they are scheduled. A draft's channels must be the
 * workspace's and its media one it may show, but its text is only checked
 * against the platforms' limits once it is scheduled, so the user can work
 * on it in the meantime.
 *
 * Creating a draft needs post:create, changing one post:update; both read
 * the workspace's channels, which needs channel:read.
 */
export class PostDrafts extends Context.Service<
  PostDrafts,
  {
    readonly create: (
      actor: Actor,
      request: DraftRequest
    ) => Effect.Effect<PostWithTargets, DraftFailure>;
    /** Replaces a draft's content and channels. */
    readonly update: (
      actor: Actor,
      postId: PostId,
      request: DraftRequest
    ) => Effect.Effect<
      PostWithTargets,
      DraftFailure | InvalidPostTransition | PostNotFound
    >;
  }
>()("acme-server/publishing/application/PostDrafts") {
  static readonly layer = Layer.effect(
    PostDrafts,
    Effect.gen(function* PostDraftsLive() {
      const posts = yield* PostRepository;
      const { transaction } = yield* TransactionRunner;
      const ports = yield* Effect.context<Ports>();

      const withPorts = Effect.provideContext(ports);

      // The draft's channels, once its content may go to them.
      const checked = Effect.fn("PostDrafts.checked")(function* checked(
        actor: Actor,
        permission: Permission,
        { channelIds, content }: DraftRequest
      ) {
        yield* Effect.fromResult(authorize(actor, permission));

        const channels = (yield* channelsFor(actor, channelIds)).map(
          ({ channelId }) => channelId
        );

        yield* Effect.fromResult(checkDraft(content, channels));
        yield* mediaFor(actor, content);

        return channels;
      }, withPorts);

      const create = Effect.fn("PostDrafts.create")(function* create(
        actor: Actor,
        request: DraftRequest
      ) {
        const channels = yield* checked(actor, "post:create", request);
        const postId = yield* newId(PostIdSchema).pipe(withPorts);
        const post = createDraft(postId, actor.workspaceId, request.content);
        const targets = yield* targetsOn(postId, channels).pipe(withPorts);

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
              yield* posts.lockTargets(postId)
            ).pipe(withPorts);

            yield* applied(yield* posts.update(post, current.post));
            yield* posts.setTargets(postId, targets);

            return { post, targets };
          })
        );
      });

      return PostDrafts.of({ create, update });
    })
  );
}
