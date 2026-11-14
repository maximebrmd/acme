import { Effect, Layer, Ref } from "effect";

import { PaidReads } from "#analytics/application/paid-reads.ts";

/**
 * PaidReads in memory, for one day: each workspace may read `allowance`
 * resources on a platform, those it already read not counted again.
 */
export const paidReadsOf = (
  allowance: number,
  {
    reads = true,
    released,
  }: {
    /** Whether the workspace reads the platform at all. */
    readonly reads?: boolean;
    /** Where the resources given back are kept. */
    readonly released?: Ref.Ref<readonly string[]>;
  } = {}
) =>
  Layer.sync(PaidReads, () => {
    const read = new Map<string, Set<string>>();

    return PaidReads.of({
      claim: ({ platform, resources, workspaceId }) =>
        Effect.sync(() => {
          const key = `${workspaceId}/${platform}`;
          const had = read.get(key) ?? new Set<string>();

          read.set(key, had);

          const fresh: string[] = [];

          const covered = resources.filter((resource) => {
            if (had.has(resource)) {
              return true;
            }

            if (had.size >= allowance) {
              return false;
            }

            had.add(resource);
            fresh.push(resource);

            return true;
          });

          return { fresh, resources: covered };
        }),
      reads: () => Effect.succeed(reads),
      release: ({ resources }) =>
        released === undefined
          ? Effect.void
          : Ref.update(released, (all) => [...all, ...resources]),
    });
  });
