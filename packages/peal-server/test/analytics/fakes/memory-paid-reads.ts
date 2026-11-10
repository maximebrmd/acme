import { Effect, Layer } from "effect";

import { PaidReads } from "#analytics/application/paid-reads.ts";

/**
 * PaidReads in memory, for one day: each workspace may read `allowance`
 * resources on a platform, those it already read not counted again.
 */
export const paidReadsOf = (allowance: number) =>
  Layer.sync(PaidReads, () => {
    const read = new Map<string, Set<string>>();

    return PaidReads.of({
      claim: ({ platform, resources, workspaceId }) =>
        Effect.sync(() => {
          const key = `${workspaceId}/${platform}`;
          const had = read.get(key) ?? new Set<string>();

          read.set(key, had);

          return resources.filter((resource) => {
            if (had.has(resource)) {
              return true;
            }

            if (had.size >= allowance) {
              return false;
            }

            had.add(resource);

            return true;
          });
        }),
    });
  });
