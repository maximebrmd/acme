import { Context, DateTime, Effect, Layer, Option, Schema } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import { ShortCodeSchema } from "#shortlinks/domain/short-code.ts";
import type { ShortLink } from "#shortlinks/domain/short-link.ts";

import { ShortLinkStore } from "./short-link-store.ts";

const decodeCode = Schema.decodeUnknownOption(ShortCodeSchema);

/**
 * Short links as staff handle a report about one, for the staff context:
 * a link by its code, and turning it off (it answers 410) or on again.
 * No permission is checked here: the staff context's use cases record each
 * change in the audit log before they ask for it.
 */
export class ShortLinkModeration extends Context.Service<
  ShortLinkModeration,
  {
    /** The link of this code; none when none has it, or it is no code. */
    readonly byCode: (
      code: string
    ) => Effect.Effect<Option.Option<ShortLink>, DatabaseError>;
    /** Turns the link off, or on again; none when no link has the code. */
    readonly setDisabled: (
      code: string,
      disabled: boolean
    ) => Effect.Effect<Option.Option<ShortLink>, DatabaseError>;
  }
>()("peal-server/shortlinks/application/ShortLinkModeration") {
  static readonly layer = Layer.effect(
    ShortLinkModeration,
    Effect.gen(function* ShortLinkModerationLive() {
      const store = yield* ShortLinkStore;

      const byCode = (code: string) =>
        Option.match(decodeCode(code), {
          onNone: () => Effect.succeedNone,
          onSome: (valid) => store.byCode(valid),
        });

      const setDisabled = Effect.fn("ShortLinkModeration.setDisabled")(
        function* setDisabled(code: string, disabled: boolean) {
          const valid = decodeCode(code);

          if (Option.isNone(valid)) {
            return Option.none<ShortLink>();
          }

          const at = disabled
            ? Option.some(yield* DateTime.now)
            : Option.none<DateTime.Utc>();

          const changed = yield* store.setDisabled(valid.value, at);

          return changed ? yield* store.byCode(valid.value) : Option.none();
        }
      );

      return ShortLinkModeration.of({ byCode, setDisabled });
    })
  );
}
