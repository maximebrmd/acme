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
  tagPost,
  withLinksShortened,
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
import type { AttachableMedia } from "./attachable-media.ts";
import type { ChannelSetNotFound } from "./channel-set-not-found.ts";
import { copyOf } from "./post-copies.ts";
import type { PostNotFound } from "./post-not-found.ts";
import { PostOrigins } from "./post-origins.ts";
import { nothingAsked, PostPresets } from "./post-presets.ts";
import type { PresetAsk } from "./post-presets.ts";
import { channelsFor, mediaFor, tagsFor } from "./post-references.ts";
import { PostRepository } from "./post-repository.ts";
import type { PostWithTargets } from "./post-repository.ts";
import { ShortLinkDefaults } from "./short-link-defaults.ts";
import type { SignatureNotFound } from "./signature-not-found.ts";
import { TagStore } from "./tag-store.ts";
import type { UnknownChannels } from "./unknown-channels.ts";
import type { UnknownMedia } from "./unknown-media.ts";
import type { UnknownTags } from "./unknown-tags.ts";
import type { WorkspaceChannels } from "./workspace-channels.ts";
import {
  findInWorkspace,
  lockInWorkspace,
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
   * What it takes from what the workspace saved: channel sets, and
   * signatures. Left out, nothing.
   */
  readonly presets?: PresetAsk;
  /**
   * Whether its links go out shortened. Left out, a new draft takes the
   * workspace's default (`ShortLinkDefaults`), and a draft that is changed
   * keeps its own choice.
   */
  readonly shortenLinks?: boolean | undefined;
  /**
   * The workspace's tags it is filed under. Left out, a new draft has
   * none, and a draft that is changed keeps its own.
   */
  readonly tagIds?: readonly TagId[];
}

type DraftFailure =
  | ChannelSetNotFound
  | DatabaseError
  | MissingPermission
  | PostContentRejected
  | SignatureNotFound
  | UnknownChannels
  | UnknownMedia
  | UnknownTags;

type Ports =
  | AttachableMedia
  | Ids
  | PostPresets
  | PostOrigins
  | PostRepository
  | ShortLinkDefaults
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
        yield* mediaFor(actor, content, options);

        return channels.map(({ channelId }) => channelId);
      }, withPorts);

      // The request with what it names of the workspace's saved items
      // filled in. Only a new draft takes the channels' default options.
      const filled = (actor: Actor, request: DraftRequest, isNew: boolean) =>
        PostPresets.use((presets) =>
          presets.fill(actor, {
            ...(request.presets ?? nothingAsked),
            channelIds: request.channelIds,
            content: request.content,
            defaultOptions: isNew,
            options: request.options ?? [],
          })
        ).pipe(
          Effect.map(
            ({ channelIds, content, dropped, options }) =>
              [{ ...request, channelIds, content, options }, dropped] as const
          ),
          withPorts
        );

      // The tags a request names, once they are the workspace's. Inside
      // the transaction that keeps them, after the workspace's tags are
      // claimed: a tag deleted meanwhile is refused, never kept.
      const tagsOf = (actor: Actor, { tagIds }: DraftRequest) =>
        tagIds === undefined
          ? Effect.succeed(Option.none<readonly TagId[]>())
          : TagStore.use((store) => store.claim(actor.workspaceId)).pipe(
              Effect.andThen(tagsFor(actor.workspaceId, tagIds)),
              Effect.map(Option.some),
              withPorts
            );

      const create = Effect.fn("PostDrafts.create")(function* create(
        actor: Actor,
        asked: DraftRequest
      ) {
        yield* Effect.fromResult(authorize(actor, "post:create"));

        const [request, dropped] = yield* filled(actor, asked, true);
        const channels = yield* checked(actor, "post:create", request);
        const postId = yield* newId(PostIdSchema).pipe(withPorts);

        const via = yield* PostOrigins.use((origins) => origins.of(actor)).pipe(
          withPorts
        );

        const shortenLinks =
          request.shortenLinks ??
          (yield* ShortLinkDefaults.use((defaults) =>
            defaults.byDefault(actor.workspaceId)
          ).pipe(withPorts));

        const targets = yield* targetsOn(
          postId,
          channels,
          [],
          Option.some(request.options ?? [])
        ).pipe(withPorts);

        const post = yield* transaction(
          Effect.gen(function* insert() {
            const tags = yield* tagsOf(actor, request);

            const made = withLinksShortened(
              tagPost(
                createDraft(
                  postId,
                  actor.workspaceId,
                  request.content,
                  authorOf(actor),
                  Option.some(via)
                ),
                Option.getOrElse(tags, () => [])
              ),
              shortenLinks
            );

            yield* posts.insert(made, targets);

            return made;
          })
        );

        return { dropped, post, targets };
      });

      const update = Effect.fn("PostDrafts.update")(function* update(
        actor: Actor,
        postId: PostId,
        asked: DraftRequest
      ) {
        yield* Effect.fromResult(authorize(actor, "post:update"));

        const [request, dropped] = yield* filled(actor, asked, false);
        const channels = yield* checked(actor, "post:update", request);

        return yield* transaction(
          Effect.gen(function* edit() {
            // Before the post, as deleting a tag takes them in turn.
            const tags = yield* tagsOf(actor, request);

            const current = yield* lockInWorkspace(
              actor.workspaceId,
              postId
            ).pipe(withPorts);

            const edited = yield* Effect.fromResult(
              editDraft(current.post, request.content)
            );

            const tagged = Option.match(tags, {
              onNone: () => edited,
              onSome: (chosen) => tagPost(edited, chosen),
            });

            const post =
              request.shortenLinks === undefined
                ? tagged
                : withLinksShortened(tagged, request.shortenLinks);

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

            return { dropped, post, targets };
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

        const copy = yield* copyOf(
          actor,
          post,
          yield* posts.targets(postId)
        ).pipe(withPorts);

        return yield* create(actor, copy).pipe(
          // Checked a moment ago: gone since, they are the server's to
          // answer for, not the request's.
          Effect.catchTags({
            ChannelSetNotFound: Effect.die,
            SignatureNotFound: Effect.die,
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
