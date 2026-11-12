import { Context, DateTime, Effect, Layer, Option, Schema } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import { Ids } from "#shared/application/ids.ts";
import type {
  ChannelId,
  PostId,
  PostTargetId,
  WorkspaceId,
} from "#shared/domain/ids.ts";
import { clickDayOf } from "#shortlinks/domain/click-range.ts";
import { isCountedVisit } from "#shortlinks/domain/counted-visit.ts";
import type { VisitRequest } from "#shortlinks/domain/counted-visit.ts";
import { destinationOf, locationOf } from "#shortlinks/domain/destination.ts";
import { ShortCodeSchema } from "#shortlinks/domain/short-code.ts";
import type { ShortCode } from "#shortlinks/domain/short-code.ts";
import { ShortLinkIdSchema } from "#shortlinks/domain/short-link-id.ts";

import type { CodeTaken } from "./code-taken.ts";
import { ShortCodes } from "./short-codes.ts";
import { ShortLinkBase, shortUrlOf } from "./short-link-base.ts";
import { ShortLinkStore } from "./short-link-store.ts";
import type { LinkAsked } from "./short-link-store.ts";

const isShortCode = Schema.is(ShortCodeSchema);

/** How many codes `issue` draws for one link before it gives up. */
export const maxCodeDraws = 5;

/** The links a part of a post on one channel asks short addresses for. */
export interface IssueRequest {
  readonly channelId: ChannelId;
  /** The addresses, in the order the text holds them. */
  readonly destinations: readonly string[];
  readonly part: number;
  readonly postId: PostId;
  readonly targetId: PostTargetId;
  readonly workspaceId: WorkspaceId;
}

/** What following a code comes to. */
export type Followed =
  | { readonly _tag: "found"; readonly destination: string }
  | { readonly _tag: "disabled" }
  | { readonly _tag: "unknown" };

/**
 * Short links: issued when a post goes out, followed by anyone. `issue`
 * checks no permission: it acts for the workspace once a post goes out,
 * and only publishing's adapter calls it.
 */
export class ShortLinks extends Context.Service<
  ShortLinks,
  {
    /**
     * One short address per destination, in order: the one the target's
     * part has for it, or a new one. A destination that may not be
     * shortened, or a server without a base, answers it as written.
     */
    readonly issue: (
      request: IssueRequest
    ) => Effect.Effect<readonly string[], DatabaseError>;
    /**
     * Where a code leads, counting the visit when it counts. A count that
     * cannot be kept never stops the redirect.
     */
    readonly follow: (
      code: string,
      visit: VisitRequest
    ) => Effect.Effect<Followed, DatabaseError>;
  }
>()("peal-server/shortlinks/application/ShortLinks") {
  static readonly layer = Layer.effect(
    ShortLinks,
    Effect.gen(function* ShortLinksLive() {
      const store = yield* ShortLinkStore;
      const codes = yield* ShortCodes;
      const ids = yield* Ids;
      const { base } = yield* ShortLinkBase;

      // The link's code, drawing again while another link holds the one
      // drawn: a defect past `maxCodeDraws`, as the codes are far from full.
      const codeFor = (
        asked: LinkAsked,
        draws: number
      ): Effect.Effect<ShortCode, DatabaseError> =>
        Effect.gen(function* drawn() {
          const fresh = {
            code: yield* codes.draw,
            createdAt: yield* DateTime.now,
            id: ShortLinkIdSchema.make(yield* ids.next),
          };

          return yield* store.issue(asked, fresh);
        }).pipe(
          Effect.catchTag("CodeTaken", (taken: CodeTaken) =>
            draws + 1 < maxCodeDraws
              ? codeFor(asked, draws + 1)
              : Effect.die(taken)
          )
        );

      const issue = Effect.fn("ShortLinks.issue")(function* issue(
        request: IssueRequest
      ) {
        if (Option.isNone(base)) {
          return request.destinations;
        }

        const { destinations, ...asked } = request;

        return yield* Effect.all(
          destinations.map((destination) =>
            Option.match(destinationOf(destination, base.value), {
              onNone: () => Effect.succeed(destination),
              onSome: (written) =>
                codeFor({ ...asked, destination: written }, 0).pipe(
                  Effect.map((code) => shortUrlOf(base.value, code))
                ),
            })
          )
        );
      });

      const follow = Effect.fn("ShortLinks.follow")(function* follow(
        code: string,
        visit: VisitRequest
      ) {
        if (!isShortCode(code)) {
          return { _tag: "unknown" } satisfies Followed;
        }

        const found = yield* store.byCode(code);

        if (Option.isNone(found)) {
          return { _tag: "unknown" } satisfies Followed;
        }

        const link = found.value;

        if (Option.isSome(link.disabledAt)) {
          return { _tag: "disabled" } satisfies Followed;
        }

        if (isCountedVisit(visit)) {
          yield* store
            .count(link.id, clickDayOf(yield* DateTime.now))
            .pipe(
              Effect.catchTag("DatabaseError", (failure) =>
                Effect.logWarning(
                  "Could not count a short link's visit",
                  failure
                )
              )
            );
        }

        // Written again as an address: a header carries ASCII only, and a
        // value it cannot carry would leave the redirect unanswered.
        const location = locationOf(link.destination);

        if (Option.isNone(location)) {
          yield* Effect.logWarning(
            "A short link's destination cannot be written in a redirect"
          );

          return { _tag: "unknown" } satisfies Followed;
        }

        return {
          _tag: "found",
          destination: location.value,
        } satisfies Followed;
      });

      return ShortLinks.of({ follow, issue });
    })
  );
}
