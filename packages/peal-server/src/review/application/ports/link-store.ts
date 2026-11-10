import { Context } from "effect";
import type { Effect, Option } from "effect";

import type { ReviewLinkId } from "#review/domain/review-ids.ts";
import type { ReviewLink } from "#review/domain/review-link.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { PostId, WorkspaceId } from "#shared/domain/ids.ts";

/** Review links, found by the hash of their token. */
export class LinkStore extends Context.Service<
  LinkStore,
  {
    readonly insert: (
      link: ReviewLink,
      tokenHash: string
    ) => Effect.Effect<void, DatabaseError>;
    readonly byTokenHash: (
      tokenHash: string
    ) => Effect.Effect<Option.Option<ReviewLink>, DatabaseError>;
    /** The workspace's link, whatever its post. */
    readonly get: (
      workspaceId: WorkspaceId,
      linkId: ReviewLinkId
    ) => Effect.Effect<Option.Option<ReviewLink>, DatabaseError>;
    /** The post's links, newest first, ended ones included. */
    readonly ofPost: (
      workspaceId: WorkspaceId,
      postId: PostId
    ) => Effect.Effect<readonly ReviewLink[], DatabaseError>;
    /** Saves a link's revocation. */
    readonly update: (link: ReviewLink) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/review/application/LinkStore") {}
