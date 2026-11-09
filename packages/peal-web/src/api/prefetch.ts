import { Effect } from "effect";
import { AtomRegistry, Hydration } from "effect/reactivity";
import type { AsyncResult, Atom } from "effect/reactivity";

import { apiBaseUrl } from "#api/client.ts";
import { serverUrl } from "#api/server-url.ts";

type Query = Atom.Atom<AsyncResult.AsyncResult<unknown, unknown>>;

// Runs queries against the API directly, in a registry of their own, and
// returns their results for a HydrationBoundary. A failed query is a result
// too; one still running after the timeout is left for the browser.
export const prefetchEffect = Effect.fn("prefetch")(function* prefetchQueries(
  queries: readonly Query[]
) {
  const baseUrl = yield* serverUrl;

  return yield* Effect.acquireUseRelease(
    Effect.sync(() =>
      AtomRegistry.make({ initialValues: [[apiBaseUrl, baseUrl]] })
    ),
    (registry) =>
      Effect.gen(function* settle() {
        const unmount = queries.map((query) => registry.mount(query));

        yield* Effect.forEach(
          queries,
          (query) => Effect.exit(AtomRegistry.getResult(registry, query)),
          { concurrency: "unbounded", discard: true }
        ).pipe(Effect.timeoutOption("3 seconds"));

        const state = Hydration.dehydrate(registry);

        for (const release of unmount) {
          release();
        }

        return state;
      }),
    (registry) =>
      Effect.sync(() => {
        registry.dispose();
      })
  );
});

// For Server Components: the page arrives with the data.
export const prefetch = async (
  queries: readonly Query[]
): Promise<Hydration.DehydratedAtom[]> =>
  await Effect.runPromise(prefetchEffect(queries));
