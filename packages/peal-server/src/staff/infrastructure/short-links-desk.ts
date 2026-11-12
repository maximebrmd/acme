import { Effect, Layer, Option } from "effect";

import { ShortLinkModeration } from "#shortlinks/application/short-link-moderation.ts";
import { ShortLinkDesk } from "#staff/application/ports/short-link-desk.ts";
import type { StaffShortLinkSummary } from "#staff/application/ports/short-link-desk.ts";

type Moderated = Effect.Success<
  ReturnType<ShortLinkModeration["Service"]["byCode"]>
>;

const summaryOf = (found: Moderated): Option.Option<StaffShortLinkSummary> =>
  found.pipe(
    Option.map((link) => ({
      channelId: link.channelId,
      code: link.code,
      createdAt: link.createdAt,
      destination: link.destination,
      disabledAt: link.disabledAt,
      postId: link.postId,
      workspaceId: link.workspaceId,
    }))
  );

/** ShortLinkDesk, on the shortlinks context's moderation. */
export const ShortLinksDesk = Layer.effect(
  ShortLinkDesk,
  Effect.gen(function* ShortLinksDesk() {
    const moderation = yield* ShortLinkModeration;

    return ShortLinkDesk.of({
      find: (code) => moderation.byCode(code).pipe(Effect.map(summaryOf)),
      setDisabled: (code, disabled) =>
        moderation.setDisabled(code, disabled).pipe(Effect.map(summaryOf)),
    });
  })
);
