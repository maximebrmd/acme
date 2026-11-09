import { Context } from "effect";
import type { Effect } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import type { MediaAssetId } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";

/**
 * The images and videos a post may show: media of the actor's workspace
 * that the media context has stored and checked.
 */
export class AttachableMedia extends Context.Service<
  AttachableMedia,
  {
    /** The media among `mediaIds` that the actor's posts may show. */
    readonly lookUp: (
      actor: Actor,
      mediaIds: readonly MediaAssetId[]
    ) => Effect.Effect<
      readonly MediaAssetId[],
      DatabaseError | MissingPermission
    >;
  }
>()("acme-server/publishing/application/AttachableMedia") {}
