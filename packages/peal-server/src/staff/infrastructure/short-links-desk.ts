import { Effect, Layer, Option } from "effect";

import { ShortLinkModeration } from "#shortlinks/application/short-link-moderation.ts";
import { ShortLinkDesk } from "#staff/application/ports/short-link-desk.ts";
import type { StaffShortLinkSummary } from "#staff/application/ports/short-link-desk.ts";

// A link as the shortlinks context answers it.
type Moderated = Option.Option.Value<
  Effect.Success<ReturnType<ShortLinkModeration["Service"]["byCode"]>>
>;

const summaryOf = (link: Moderated): StaffShortLinkSummary => ({
  channelId: link.channelId,
  code: link.code,
  createdAt: link.createdAt,
  destination: link.destination,
  disabledAt: link.disabledAt,
  postId: link.postId,
  workspaceId: link.workspaceId,
});

/** ShortLinkDesk, on the shortlinks context's moderation. */
export const ShortLinksDesk = Layer.effect(
  ShortLinkDesk,
  Effect.gen(function* ShortLinksDesk() {
    const moderation = yield* ShortLinkModeration;

    return ShortLinkDesk.of({
      disableWorkspace: (workspaceId) =>
        moderation.disableWorkspace(workspaceId),
      find: (code) =>
        moderation.byCode(code).pipe(Effect.map(Option.map(summaryOf))),
      ofWorkspace: (workspaceId, limit) =>
        moderation.ofWorkspace(workspaceId, limit).pipe(
          Effect.map(({ links, total }) => ({
            links: links.map(summaryOf),
            total,
          }))
        ),
      setDisabled: (code, disabled) =>
        moderation
          .setDisabled(code, disabled)
          .pipe(Effect.map(Option.map(summaryOf))),
    });
  })
);
