import { Effect, Layer, Option } from "effect";

import { XPassThrough } from "#billing/application/x-pass-through.ts";
import { PostMeter } from "#publishing/application/post-meter.ts";
import type { MeteredPart } from "#publishing/application/post-meter.ts";
import { countLinks } from "#publishing/domain/text-length.ts";
import { MeteredUsage } from "#shared/application/metered-usage.ts";
import { AllowanceReached } from "#shared/domain/allowance-reached.ts";

/**
 * The parts sent to X, the platform that bills the server for each post,
 * claimed on the billing account's `xApi` meter at X's rate (billing's
 * `XPassThrough`): a post with a link, as X finds links (`countLinks`),
 * costs `postCreateWithUrl`, any other `postCreate`. Every other platform
 * claims nothing. On a server that does not bill, the meters count and
 * refuse nothing (`MeteredUsage.layerUnmetered`), so X publishes as it
 * always did.
 */
export const MeteredXPostsLive = Layer.effect(
  PostMeter,
  Effect.gen(function* MeteredXPosts() {
    const meters = yield* MeteredUsage;
    const { rates } = yield* XPassThrough;

    // What a part costs on X: a post, or a post with a link.
    const unitsOf = (text: string) =>
      countLinks(text) > 0 ? rates.postCreateWithUrl : rates.postCreate;

    const claim = Effect.fn("PostMeter.claim")(function* claim({
      platform,
      text,
      workspaceId,
    }: MeteredPart) {
      if (platform !== "x") {
        return Option.none();
      }

      return Option.some(
        yield* meters.claim(workspaceId, "xApi", unitsOf(text))
      );
    });

    // The whole thread against what the meter allows now: refused as its
    // first claim past it would be.
    const fits = Effect.fn("PostMeter.fits")(function* fits(
      parts: readonly MeteredPart[]
    ) {
      const onX = parts.filter(({ platform }) => platform === "x");
      const [first] = onX;

      if (first === undefined) {
        return Option.none<AllowanceReached>();
      }

      let units = 0;

      for (const { text } of onX) {
        units += unitsOf(text);
      }

      const state = yield* meters.state(first.workspaceId, "xApi");

      return state.pipe(
        Option.flatMap((now) =>
          now.allowed.pipe(
            Option.filter((most) => now.used + units > most),
            Option.map(
              (most) =>
                new AllowanceReached({
                  allowed: most,
                  meter: "xApi",
                  reason: now.pastAllowed,
                  resetsAt: now.resetsAt,
                  used: now.used,
                })
            )
          )
        )
      );
    });

    return PostMeter.of({ claim, fits, giveBack: meters.giveBack });
  })
);
