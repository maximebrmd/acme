import { Effect, Tracer } from "effect";

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

/**
 * The statements an effect sends to Postgres: each is a span that carries
 * its text. Counted rather than timed, a read's cost is the same on an idle
 * machine and on a loaded one.
 */
export const statementsOf = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.gen(function* counted() {
    const spans: Tracer.NativeSpan[] = [];

    const tracer = Tracer.make({
      span: (options) => {
        const span = new Tracer.NativeSpan(options);

        spans.push(span);

        return span;
      },
    });

    const result = yield* effect.pipe(Effect.withTracer(tracer));

    const statements = spans.filter((span) =>
      span.attributes.has("db.query.text")
    ).length;

    return { result, statements };
  });

export { FakeMetersLedger, fakeMeters } from "#test/shared/fake-meters.ts";

export type { MetersLedger } from "#test/shared/fake-meters.ts";
