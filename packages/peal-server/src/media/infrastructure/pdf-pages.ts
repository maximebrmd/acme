import { promisify } from "node:util";
import { inflate } from "node:zlib";

import { Effect, Option } from "effect";

const inflated = promisify(inflate);

const bytesOf = (text: string): readonly number[] => [
  ...new TextEncoder().encode(text),
];

const header = bytesOf("%PDF-");

// A PDF's header is within its first 1024 bytes (the PDF reference's
// implementation notes), not always at the very start.
const headerWindow = 1024;

const startsAt = (bytes: Uint8Array, at: number, sequence: readonly number[]) =>
  sequence.every((byte, index) => bytes[at + index] === byte);

// Where `sequence` next is, at or after `from`, before `end`.
const find = (
  bytes: Uint8Array,
  sequence: readonly number[],
  from: number,
  end = bytes.length
): number => {
  const [first] = sequence;
  const last = end - sequence.length;

  for (let at = from; at <= last; at += 1) {
    if (bytes[at] === first && startsAt(bytes, at, sequence)) {
      return at;
    }
  }

  return -1;
};

/** Whether the file starts as a PDF does. */
export const isPdf = (bytes: Uint8Array): boolean =>
  find(bytes, header, 0, Math.min(bytes.length, headerWindow)) !== -1;

const typeKey = bytesOf("/Type");
const pageName = bytesOf("/Page");
const objectStreamName = bytesOf("/ObjStm");
const streamKeyword = bytesOf("stream");
const endStreamKeyword = bytesOf("endstream");
const dictionaryEnd = bytesOf(">>");

// PDF's white space: NUL, tab, line feed, form feed, carriage return, space.
const isWhiteSpace = (byte: number | undefined) =>
  byte === 0 ||
  byte === 9 ||
  byte === 10 ||
  byte === 12 ||
  byte === 13 ||
  byte === 32;

// A name ends at white space or a delimiter: `/Page` is not `/Pages`.
const endsName = (byte: number | undefined) =>
  byte === undefined ||
  isWhiteSpace(byte) ||
  bytesOf("()<>[]{}/%").includes(byte);

// The name a `/Type` key at `at` has, as where it starts; -1 without one.
const typeValueAt = (bytes: Uint8Array, at: number): number => {
  let value = at + typeKey.length;

  while (isWhiteSpace(bytes[value])) {
    value += 1;
  }

  return bytes[value] === 0x2f ? value : -1;
};

const isName = (bytes: Uint8Array, at: number, name: readonly number[]) =>
  at !== -1 && startsAt(bytes, at, name) && endsName(bytes[at + name.length]);

interface Scan {
  /** The objects of type Page. */
  readonly pages: number;
  /** The bodies of the object streams, still compressed. */
  readonly streams: readonly Uint8Array[];
}

// The body of the stream whose dictionary holds the `/Type /ObjStm` at
// `at`: from the line after `stream` to `endstream`.
const streamBodyAt = (
  bytes: Uint8Array,
  at: number
): Option.Option<Uint8Array> => {
  const dictionary = find(bytes, dictionaryEnd, at);

  const keyword =
    dictionary === -1 ? -1 : find(bytes, streamKeyword, dictionary);

  if (keyword === -1) {
    return Option.none();
  }

  let start = keyword + streamKeyword.length;

  // `stream` is followed by a line feed, or a carriage return and one.
  if (bytes[start] === 13) {
    start += 1;
  }

  if (bytes[start] === 10) {
    start += 1;
  }

  const end = find(bytes, endStreamKeyword, start);

  return end === -1 ? Option.none() : Option.some(bytes.subarray(start, end));
};

const scan = (bytes: Uint8Array, withStreams: boolean): Scan => {
  const streams: Uint8Array[] = [];
  let pages = 0;
  let at = find(bytes, typeKey, 0);

  while (at !== -1) {
    const value = typeValueAt(bytes, at);

    if (isName(bytes, value, pageName)) {
      pages += 1;
    } else if (withStreams && isName(bytes, value, objectStreamName)) {
      const body = streamBodyAt(bytes, value);

      if (Option.isSome(body)) {
        streams.push(body.value);
        // Its compressed bytes are not objects to read.
        at = body.value.byteOffset - bytes.byteOffset + body.value.length;
      }
    }

    at = find(bytes, typeKey, at + typeKey.length);
  }

  return { pages, streams };
};

// The most one object stream may inflate to: page objects are small, and
// a stream that claims more is not read.
const maxInflated = 64 * 1024 * 1024;

/**
 * How many pages a PDF has, as far as its bytes tell without a PDF
 * library: the objects of type Page, counted where they are written in
 * the clear and inside the object streams PDF 1.5 packs them in, which
 * are inflated (zlib, 64 MiB each at most). None when the count cannot be
 * trusted: an object stream that does not inflate, as in an encrypted
 * file, or a file that shows no page at all.
 *
 * A file saved several times over may keep its old page objects, and
 * count more pages than it shows: the count only keeps out files far past
 * what a platform takes.
 */
export const countPdfPages = (
  bytes: Uint8Array
): Effect.Effect<Option.Option<number>> =>
  Effect.gen(function* counting() {
    const outer = scan(bytes, true);
    let { pages } = outer;

    for (const stream of outer.streams) {
      const plain = yield* Effect.tryPromise(
        async () => await inflated(stream, { maxOutputLength: maxInflated })
      ).pipe(Effect.option);

      if (Option.isNone(plain)) {
        return Option.none<number>();
      }

      pages += scan(plain.value, false).pages;
    }

    return pages > 0 ? Option.some(pages) : Option.none<number>();
  });
