import { Context, DateTime, Effect, Layer, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";

import { DigestLinks } from "./digest-links.ts";
import { PreferenceStore } from "./preference-store.ts";

/**
 * The weekly digest's one-click unsubscribe (RFC 8058): a token from the
 * email's `List-Unsubscribe` header turns its holder's digest off, and
 * nothing else, while it is of their links' current generation.
 */
export class UnsubscribeWeeklyDigest extends Context.Service<
  UnsubscribeWeeklyDigest,
  {
    /** Whether the token was good: then the digest is off. */
    readonly unsubscribe: (
      token: string
    ) => Effect.Effect<boolean, DatabaseError>;
  }
>()("peal-server/notifications/application/UnsubscribeWeeklyDigest") {
  static readonly layer = Layer.effect(
    UnsubscribeWeeklyDigest,
    Effect.gen(function* UnsubscribeWeeklyDigestLive() {
      const links = yield* DigestLinks;
      const preferences = yield* PreferenceStore;

      const unsubscribe = Effect.fn("UnsubscribeWeeklyDigest.unsubscribe")(
        function* unsubscribe(token: string) {
          const holder = yield* links.read(token);

          if (Option.isNone(holder)) {
            return false;
          }

          return yield* preferences.unsubscribeDigest(
            holder.value.userId,
            holder.value.links,
            yield* DateTime.now
          );
        }
      );

      return UnsubscribeWeeklyDigest.of({ unsubscribe });
    })
  );
}
