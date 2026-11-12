import { Context, DateTime, Effect, Layer, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { ChannelId, PostId } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";
import { clickRangeOf, daysOf } from "#shortlinks/domain/click-range.ts";
import type { ClickRange } from "#shortlinks/domain/click-range.ts";
import type { InvalidClickRange } from "#shortlinks/domain/invalid-click-range.ts";
import type { ShortLinkId } from "#shortlinks/domain/short-link-id.ts";
import type { ShortLink } from "#shortlinks/domain/short-link.ts";

import { ShortLinkNotFound } from "./short-link-not-found.ts";
import { ShortLinkStore } from "./short-link-store.ts";
import type { LinkPage } from "./short-link-store.ts";

/** How many links a page holds at most. */
export const maxLinksPerPage = 100;

/** The days asked, as their first instants (UTC), each left out or given. */
export interface AskedRange {
  readonly from: Option.Option<DateTime.Utc>;
  readonly to: Option.Option<DateTime.Utc>;
}

/** Which of the workspace's links to list, and over which days. */
export interface LinkListRequest extends AskedRange {
  readonly channelId: Option.Option<ChannelId>;
  readonly cursor: Option.Option<ShortLinkId>;
  readonly limit: Option.Option<number>;
  readonly postId: Option.Option<PostId>;
}

/** A page of links, with the days their clicks cover. */
export interface LinkReport extends LinkPage {
  readonly range: ClickRange;
}

/** One link, its clicks each day of the range, oldest first. */
export interface LinkDays {
  readonly days: readonly {
    readonly clicks: number;
    readonly day: DateTime.Utc;
  }[];
  readonly link: ShortLink;
  readonly range: ClickRange;
}

const rangeOf = (asked: AskedRange) =>
  DateTime.now.pipe(
    Effect.flatMap((now) => Effect.fromResult(clickRangeOf(asked, now)))
  );

/**
 * How many times a workspace's short links were followed, by day (UTC):
 * counts only, nothing about who followed them. Needs analytics:read.
 */
export class ShortLinkReports extends Context.Service<
  ShortLinkReports,
  {
    readonly list: (
      actor: Actor,
      request: LinkListRequest
    ) => Effect.Effect<
      LinkReport,
      DatabaseError | InvalidClickRange | MissingPermission
    >;
    readonly get: (
      actor: Actor,
      linkId: ShortLinkId,
      asked: AskedRange
    ) => Effect.Effect<
      LinkDays,
      DatabaseError | InvalidClickRange | MissingPermission | ShortLinkNotFound
    >;
  }
>()("peal-server/shortlinks/application/ShortLinkReports") {
  static readonly layer = Layer.effect(
    ShortLinkReports,
    Effect.gen(function* ShortLinkReportsLive() {
      const store = yield* ShortLinkStore;

      const list = Effect.fn("ShortLinkReports.list")(function* list(
        actor: Actor,
        request: LinkListRequest
      ) {
        yield* Effect.fromResult(authorize(actor, "analytics:read"));

        const range = yield* rangeOf(request);

        const limit = Math.min(
          Math.max(
            Option.getOrElse(request.limit, () => 50),
            1
          ),
          maxLinksPerPage
        );

        const page = yield* store.page(
          actor.workspaceId,
          {
            channelId: request.channelId,
            cursor: request.cursor,
            limit,
            postId: request.postId,
          },
          range
        );

        return { ...page, range };
      });

      const get = Effect.fn("ShortLinkReports.get")(function* get(
        actor: Actor,
        linkId: ShortLinkId,
        asked: AskedRange
      ) {
        yield* Effect.fromResult(authorize(actor, "analytics:read"));

        const range = yield* rangeOf(asked);
        const found = yield* store.linkOf(actor.workspaceId, linkId);

        if (Option.isNone(found)) {
          return yield* new ShortLinkNotFound({ linkId });
        }

        const counted = yield* store.days(linkId, range);

        const days = daysOf(range).map((day) => ({
          clicks:
            counted.find((entry) => DateTime.Equivalence(entry.day, day))
              ?.clicks ?? 0,
          day,
        }));

        return { days, link: found.value, range };
      });

      return ShortLinkReports.of({ get, list });
    })
  );
}
