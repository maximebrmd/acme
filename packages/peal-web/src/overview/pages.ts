import { Clock, Duration, Effect, Option } from "effect";
import type { Overview, WorkspaceOverview } from "peal-contract";

/**
 * A person in more workspaces than this many pages hold sees the cards
 * after them as they were before the overview: links, and no figure.
 */
export const mostPages = 20;

/** How long one page may take before the pages read so far are shown. */
export const pageTimeout = Duration.seconds(5);

/**
 * How long the whole read may take, whatever the number of pages: past it
 * no page starts, and the one under way is cut short, so the home renders
 * within it.
 */
export const homeBudget = Duration.seconds(8);

/**
 * The overview's pages, one after the other from the first, by workspace
 * id: up to `mostPages`, each within `pageTimeout`, all within
 * `homeBudget`. A page that fails or takes too long ends the read, and the
 * pages before it are kept: the cards of the others show as they do when
 * nothing can be read.
 */
export const overviewPages = Effect.fn("overviewPages")(function* overviewPages<
  E,
  R,
>(read: (cursor: Option.Option<string>) => Effect.Effect<Overview, E, R>) {
  const found = new Map<string, WorkspaceOverview>();
  const startedAt = yield* Clock.currentTimeMillis;
  let cursor = Option.none<string>();

  for (let page = 0; page < mostPages; page += 1) {
    const left = Duration.subtract(
      homeBudget,
      Duration.millis((yield* Clock.currentTimeMillis) - startedAt)
    );

    if (!Duration.isGreaterThan(left, Duration.zero)) {
      break;
    }

    const answered = yield* read(cursor).pipe(
      Effect.timeout(Duration.min(pageTimeout, left)),
      Effect.asSome,
      Effect.catchCause((cause) =>
        Effect.logWarning(
          `The overview could not be read past ${String(page)} pages`,
          cause
        ).pipe(Effect.as(Option.none<Overview>()))
      )
    );

    if (Option.isNone(answered)) {
      break;
    }

    for (const workspace of answered.value.workspaces) {
      found.set(workspace.id, workspace);
    }

    cursor = Option.fromNullOr(answered.value.nextCursor);

    if (Option.isNone(cursor)) {
      break;
    }
  }

  return found;
});
