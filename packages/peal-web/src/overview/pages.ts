import { Duration, Effect, Option } from "effect";
import type { Overview, WorkspaceOverview } from "peal-contract";

/**
 * A person in more workspaces than this many pages hold sees the cards
 * after them as they were before the overview: links, and no figure.
 */
export const mostPages = 20;

/** How long one page may take before the pages read so far are shown. */
export const pageTimeout = Duration.seconds(5);

/**
 * The overview's pages, one after the other from the first, by workspace
 * id: up to `mostPages`, each within `pageTimeout`. A page that fails or
 * takes too long ends the read, and the pages before it are kept: the
 * cards of the others show as they do when nothing can be read.
 */
export const overviewPages = Effect.fn("overviewPages")(function* overviewPages<
  E,
  R,
>(read: (cursor: Option.Option<string>) => Effect.Effect<Overview, E, R>) {
  const found = new Map<string, WorkspaceOverview>();
  let cursor = Option.none<string>();

  for (let page = 0; page < mostPages; page += 1) {
    const answered = yield* read(cursor).pipe(
      Effect.timeout(pageTimeout),
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
