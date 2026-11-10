import { Context } from "effect";
import type { Effect, Option } from "effect";

import type { TagId } from "#publishing/domain/tag-id.ts";
import type { Tag } from "#publishing/domain/tag.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/** A workspace's tags, as they are kept. */
export class TagStore extends Context.Service<
  TagStore,
  {
    /**
     * Holds back, until the transaction it runs in ends, any other
     * transaction that claims the workspace's tags: counting them, or
     * looking for a name, then writing one, takes turns.
     */
    readonly claim: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError>;
    /** The workspace's tags, oldest first. */
    readonly list: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly Tag[], DatabaseError>;
    readonly byId: (
      workspaceId: WorkspaceId,
      tagId: TagId
    ) => Effect.Effect<Option.Option<Tag>, DatabaseError>;
    readonly insert: (tag: Tag) => Effect.Effect<void, DatabaseError>;
    /** Writes the tag's name and colour. */
    readonly update: (tag: Tag) => Effect.Effect<void, DatabaseError>;
    /** Deletes the tag, and takes it off every post that had it. */
    readonly remove: (
      workspaceId: WorkspaceId,
      tagId: TagId
    ) => Effect.Effect<void, DatabaseError>;
    /** Deletes every tag of the workspace. */
    readonly removeAll: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/publishing/application/TagStore") {}
