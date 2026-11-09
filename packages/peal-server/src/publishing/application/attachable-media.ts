import { Context } from "effect";
import type { Effect } from "effect";

import type { MediaFile } from "#publishing/domain/media-file.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import type { MediaAssetId } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";

/**
 * The images and videos a post may show: media of the actor's workspace
 * that the media context has stored and probed, ready to go out.
 */
export class AttachableMedia extends Context.Service<
  AttachableMedia,
  {
    /**
     * The files of the media among `mediaIds` that the actor's posts may
     * show, in any order. An id that names none of them is left out.
     */
    readonly lookUp: (
      actor: Actor,
      mediaIds: readonly MediaAssetId[]
    ) => Effect.Effect<readonly MediaFile[], DatabaseError | MissingPermission>;
  }
>()("peal-server/publishing/application/AttachableMedia") {}
