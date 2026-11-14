import { Effect, Layer, Option } from "effect";

import { XPassThrough } from "#billing/application/x-pass-through.ts";
import { PostMeter } from "#publishing/application/post-meter.ts";
import type { MeteredPart } from "#publishing/application/post-meter.ts";
import { countLinks } from "#publishing/domain/text-length.ts";
import { MeteredUsage } from "#shared/application/metered-usage.ts";

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

    const claim = Effect.fn("PostMeter.claim")(function* claim({
      platform,
      text,
      workspaceId,
    }: MeteredPart) {
      if (platform !== "x") {
        return Option.none();
      }

      const units =
        countLinks(text) > 0 ? rates.postCreateWithUrl : rates.postCreate;

      return Option.some(yield* meters.claim(workspaceId, "xApi", units));
    });

    return PostMeter.of({ claim, giveBack: meters.giveBack });
  })
);
