// Linear time, proved without a duration: a loaded machine takes many
// times longer over the same input than an idle one, never many times
// longer over the longer of two inputs it reads one after the other.

/** Sixteen times as long: about 16 times the time when it is linear. */
const factor = 16;

/**
 * The most a linear read may grow over input `factor` times as long: four
 * times what linear time takes, a quarter of what quadratic does (256).
 */
export const linearGrowthAtMost = 64;

// The fastest of a few runs, in milliseconds: a loaded machine slows some
// runs, rarely all of them.
const fastest = (run: () => void): number => {
  let best = Number.POSITIVE_INFINITY;

  for (let attempt = 0; attempt < 7; attempt += 1) {
    const started = performance.now();

    run();
    best = Math.min(best, performance.now() - started);
  }

  return best;
};

/** How a read grew, and what it read of the long input. */
export interface Growth<B> {
  /** The fastest time over the long input over that over the short one. */
  readonly growth: number;
  readonly result: B;
}

/**
 * How much longer `read` takes over `input(16 * size)` than over
 * `input(size)`, each timed at its fastest, the long one compiled first.
 * Choose `size` so the short input takes a tenth of a millisecond or more.
 */
export const growthOf = <A, B>(
  read: (input: A) => B,
  input: (size: number) => A,
  size: number
): Growth<B> => {
  const short = input(size);
  const long = input(factor * size);
  const result = read(long);

  const longest = fastest(() => {
    read(long);
  });

  const shortest = fastest(() => {
    read(short);
  });

  return { growth: longest / shortest, result };
};
