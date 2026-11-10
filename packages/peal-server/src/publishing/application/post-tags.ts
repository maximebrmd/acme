import { Context, DateTime, Effect, Layer, Option } from "effect";

import { tagPost } from "#publishing/domain/post.ts";
import { TagIdSchema } from "#publishing/domain/tag-id.ts";
import type { TagId } from "#publishing/domain/tag-id.ts";
import {
  createTag,
  editTag,
  maxTagsPerWorkspace,
  tagKeyOf,
} from "#publishing/domain/tag.ts";
import type { Tag, TagDetails } from "#publishing/domain/tag.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { newId } from "#shared/application/ids.ts";
import type { Ids } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { PostId } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";

import type { PostNotFound } from "./post-not-found.ts";
import { tagsFor } from "./post-references.ts";
import { PostRepository } from "./post-repository.ts";
import type { PostWithTargets } from "./post-repository.ts";
import { TagNameTaken } from "./tag-name-taken.ts";
import { TagNotFound } from "./tag-not-found.ts";
import { TagStore } from "./tag-store.ts";
import { TooManyTags } from "./too-many-tags.ts";
import type { UnknownTags } from "./unknown-tags.ts";
import { lockInWorkspace } from "./workspace-posts.ts";

// Fails when another tag of the workspace has the name.
const nameFree = (
  kept: readonly Tag[],
  name: string,
  except: Option.Option<TagId>
) =>
  kept.some(
    (tag) =>
      tagKeyOf(tag.name) === tagKeyOf(name) && !Option.contains(except, tag.id)
  )
    ? Effect.fail(new TagNameTaken({ name }))
    : Effect.void;

/**
 * A workspace's tags, and the tags of its posts.
 *
 * Reading them needs post:read; making, renaming and deleting one, and
 * filing a post under some, post:update: whoever may edit posts. A post is
 * tagged whatever its status, as its tags say nothing to the platforms.
 * Deleting a tag takes it off its posts, which stay.
 */
export class PostTags extends Context.Service<
  PostTags,
  {
    /** The workspace's tags, oldest first. */
    readonly list: (
      actor: Actor
    ) => Effect.Effect<readonly Tag[], DatabaseError | MissingPermission>;
    readonly create: (
      actor: Actor,
      details: TagDetails
    ) => Effect.Effect<
      Tag,
      DatabaseError | MissingPermission | TagNameTaken | TooManyTags
    >;
    readonly update: (
      actor: Actor,
      tagId: TagId,
      details: TagDetails
    ) => Effect.Effect<
      Tag,
      DatabaseError | MissingPermission | TagNameTaken | TagNotFound
    >;
    readonly remove: (
      actor: Actor,
      tagId: TagId
    ) => Effect.Effect<void, DatabaseError | MissingPermission | TagNotFound>;
    /** Files the post under these tags, instead of those it had. */
    readonly assign: (
      actor: Actor,
      postId: PostId,
      tagIds: readonly TagId[]
    ) => Effect.Effect<
      PostWithTargets,
      DatabaseError | MissingPermission | PostNotFound | UnknownTags
    >;
  }
>()("peal-server/publishing/application/PostTags") {
  static readonly layer = Layer.effect(
    PostTags,
    Effect.gen(function* PostTagsLive() {
      const tags = yield* TagStore;
      const posts = yield* PostRepository;
      const { transaction } = yield* TransactionRunner;
      const ports = yield* Effect.context<Ids | PostRepository | TagStore>();

      const withPorts = Effect.provideContext(ports);

      const list = Effect.fn("PostTags.list")(function* list(actor: Actor) {
        yield* Effect.fromResult(authorize(actor, "post:read"));

        return yield* tags.list(actor.workspaceId);
      });

      const create = Effect.fn("PostTags.create")(function* create(
        actor: Actor,
        details: TagDetails
      ) {
        yield* Effect.fromResult(authorize(actor, "post:update"));

        const tagId = yield* newId(TagIdSchema).pipe(withPorts);
        const now = yield* DateTime.now;

        return yield* transaction(
          Effect.gen(function* add() {
            yield* tags.claim(actor.workspaceId);

            const kept = yield* tags.list(actor.workspaceId);

            if (kept.length >= maxTagsPerWorkspace) {
              return yield* new TooManyTags({ allowed: maxTagsPerWorkspace });
            }

            yield* nameFree(kept, details.name, Option.none());

            const tag = createTag(tagId, actor.workspaceId, details, now);

            yield* tags.insert(tag);

            return tag;
          })
        );
      });

      const update = Effect.fn("PostTags.update")(function* update(
        actor: Actor,
        tagId: TagId,
        details: TagDetails
      ) {
        yield* Effect.fromResult(authorize(actor, "post:update"));

        return yield* transaction(
          Effect.gen(function* edit() {
            yield* tags.claim(actor.workspaceId);

            const kept = yield* tags.list(actor.workspaceId);
            const current = kept.find(({ id }) => id === tagId);

            if (current === undefined) {
              return yield* new TagNotFound({ tagId });
            }

            yield* nameFree(kept, details.name, Option.some(tagId));

            const tag = editTag(current, details);

            yield* tags.update(tag);

            return tag;
          })
        );
      });

      const remove = Effect.fn("PostTags.remove")(function* remove(
        actor: Actor,
        tagId: TagId
      ) {
        yield* Effect.fromResult(authorize(actor, "post:update"));

        return yield* transaction(
          Effect.gen(function* drop() {
            yield* tags.claim(actor.workspaceId);

            const found = yield* tags.byId(actor.workspaceId, tagId);

            if (Option.isNone(found)) {
              return yield* new TagNotFound({ tagId });
            }

            return yield* tags.remove(actor.workspaceId, tagId);
          })
        );
      });

      const assign = Effect.fn("PostTags.assign")(function* assign(
        actor: Actor,
        postId: PostId,
        tagIds: readonly TagId[]
      ) {
        yield* Effect.fromResult(authorize(actor, "post:update"));

        return yield* transaction(
          Effect.gen(function* file() {
            // After a tag being deleted, which then has no post to leave,
            // and before the post, as deleting a tag takes them in turn.
            yield* tags.claim(actor.workspaceId);

            const current = yield* lockInWorkspace(
              actor.workspaceId,
              postId
            ).pipe(withPorts);

            const chosen = yield* withPorts(tagsFor(actor.workspaceId, tagIds));

            yield* posts.setTags(postId, chosen);

            return {
              post: tagPost(current.post, chosen),
              targets: yield* posts.targets(postId),
            };
          })
        );
      });

      return PostTags.of({ assign, create, list, remove, update });
    })
  );
}
