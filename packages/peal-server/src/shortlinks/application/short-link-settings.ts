import { Context, Effect, Layer, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";

import { ShortLinkBase, shortLengthOf } from "./short-link-base.ts";
import { ShortLinkStore } from "./short-link-store.ts";

/** Whether the server shortens links, and what the workspace chose. */
export interface ShortLinkStatus {
  /** Whether the server has a base for short links. */
  readonly available: boolean;
  readonly base: Option.Option<string>;
  /** Whether the composer asks for short links unless told otherwise. */
  readonly byDefault: boolean;
  /** How long a short address is, in UTF-16 code units. */
  readonly shortLength: Option.Option<number>;
}

/**
 * The workspace's default for new posts: read with post:read, set by
 * owners and admins (organization:update). A post chooses for itself.
 */
export class ShortLinkSettings extends Context.Service<
  ShortLinkSettings,
  {
    readonly status: (
      actor: Actor
    ) => Effect.Effect<ShortLinkStatus, DatabaseError | MissingPermission>;
    readonly setByDefault: (
      actor: Actor,
      byDefault: boolean
    ) => Effect.Effect<ShortLinkStatus, DatabaseError | MissingPermission>;
  }
>()("peal-server/shortlinks/application/ShortLinkSettings") {
  static readonly layer = Layer.effect(
    ShortLinkSettings,
    Effect.gen(function* ShortLinkSettingsLive() {
      const store = yield* ShortLinkStore;
      const { base } = yield* ShortLinkBase;

      const statusOf = (byDefault: boolean): ShortLinkStatus => ({
        available: Option.isSome(base),
        base: base.pipe(Option.map((url) => url.href)),
        byDefault,
        shortLength: base.pipe(Option.map(shortLengthOf)),
      });

      const status = Effect.fn("ShortLinkSettings.status")(function* status(
        actor: Actor
      ) {
        yield* Effect.fromResult(authorize(actor, "post:read"));

        return statusOf(yield* store.byDefault(actor.workspaceId));
      });

      const setByDefault = Effect.fn("ShortLinkSettings.setByDefault")(
        function* setByDefault(actor: Actor, byDefault: boolean) {
          yield* Effect.fromResult(authorize(actor, "organization:update"));
          yield* store.setByDefault(actor.workspaceId, byDefault);

          return statusOf(byDefault);
        }
      );

      return ShortLinkSettings.of({ setByDefault, status });
    })
  );
}
