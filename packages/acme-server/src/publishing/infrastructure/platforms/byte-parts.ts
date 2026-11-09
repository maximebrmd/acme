import { Stream } from "effect";

// The part being filled: its bytes so far, and which part it is.
interface Filling {
  readonly bytes: Uint8Array;
  readonly filled: number;
  readonly index: number;
}

const emptyPart = (index: number, sizeOf: (index: number) => number) => ({
  bytes: new Uint8Array(Math.max(1, sizeOf(index))),
  filled: 0,
  index,
});

/**
 * The bytes of `stream` cut into parts, as chunked uploads send them: part
 * `n` holds `sizeOf(n)` bytes, and the last one what is left. Only the part
 * being filled is held in memory, however large the file, and the store's
 * own chunks may be of any size.
 */
export const inParts =
  (sizeOf: (index: number) => number) =>
  <E, R>(
    stream: Stream.Stream<Uint8Array, E, R>
  ): Stream.Stream<Uint8Array, E, R> =>
    stream.pipe(
      Stream.mapAccum(
        (): Filling => emptyPart(0, sizeOf),
        (state: Filling, chunk: Uint8Array) => {
          const parts: Uint8Array[] = [];
          let { bytes, filled, index } = state;
          let offset = 0;

          while (offset < chunk.length) {
            const taken = Math.min(
              bytes.length - filled,
              chunk.length - offset
            );

            bytes.set(chunk.subarray(offset, offset + taken), filled);
            filled += taken;
            offset += taken;

            if (filled === bytes.length) {
              parts.push(bytes);
              index += 1;
              ({ bytes, filled } = emptyPart(index, sizeOf));
            }
          }

          const next: Filling = { bytes, filled, index };

          return [next, parts] as const;
        },
        {
          onHalt: ({ bytes, filled }) =>
            filled > 0 ? [bytes.slice(0, filled)] : [],
        }
      )
    );

/**
 * The bytes of `stream` from byte `offset` on, as a resumed upload sends
 * them: the bytes before it are read and dropped, never held.
 */
export const fromByte =
  (offset: number) =>
  <E, R>(
    stream: Stream.Stream<Uint8Array, E, R>
  ): Stream.Stream<Uint8Array, E, R> =>
    offset <= 0
      ? stream
      : stream.pipe(
          Stream.mapAccum(
            () => offset,
            (left: number, chunk: Uint8Array) =>
              left >= chunk.length
                ? ([left - chunk.length, []] as const)
                : ([0, [left === 0 ? chunk : chunk.subarray(left)]] as const)
          )
        );
