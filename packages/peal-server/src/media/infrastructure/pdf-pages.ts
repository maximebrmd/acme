import { promisify } from "node:util";
import { inflate } from "node:zlib";

import { Effect, Option, Schema } from "effect";

import {
  afterLineEnd,
  bytesOf,
  find,
  nextToken,
  startsAt,
} from "./pdf-syntax.ts";

const inflated = promisify(inflate);

const header = bytesOf("%PDF-");

// A PDF's header is within its first 1024 bytes (the PDF reference's
// implementation notes), not always at the very start.
const headerWindow = 1024;

/** Whether the file starts as a PDF does. */
export const isPdf = (bytes: Uint8Array): boolean =>
  find(bytes, header, 0, Math.min(bytes.length, headerWindow)) !== -1;

const endStreamKeyword = bytesOf("endstream");

/**
 * How much of a file is read before the reader lets other work run: the
 * count never holds the process for longer than a slice takes, so a
 * timeout on it fires, and requests are answered meanwhile.
 */
export const sliceBytes = 256 * 1024;

/** The most object streams a file's count reads. */
export const maxObjectStreams = 8192;

/** The most one object stream may inflate to. */
export const maxInflatedStream = 8 * 1024 * 1024;

/** The most a file's object streams may inflate to, together. */
export const maxInflatedTotal = 128 * 1024 * 1024;

// What the count reads of a dictionary: its own keys, never those of the
// dictionaries and arrays inside it.
interface Dictionary {
  /** `/Count`, when it is written there as a whole number. */
  readonly count: Option.Option<number>;
  /** `/Filter`, when it is one name. */
  readonly filter: string;
  readonly filtered: boolean;
  /** `/Length`, when it is written there as a whole number. */
  readonly length: Option.Option<number>;
  readonly parented: boolean;
  /** `/Type`, with its slash. */
  readonly type: string;
}

const noDictionary: Dictionary = {
  count: Option.none(),
  filter: "",
  filtered: false,
  length: Option.none(),
  parented: false,
  type: "",
};

const wholeNumber = Schema.decodeUnknownOption(Schema.FiniteFromString);

const digits = /^\d+$/u;

// A key's value, when it is one word: `12`, not `12 0 R`.
const direct = (first: string, words: number): Option.Option<number> =>
  words === 1 && digits.test(first) ? wholeNumber(first) : Option.none();

// The dictionary with one more of its keys read. `first` is the first word
// of the key's value, and `words` how many it has.
const withKey = (
  dictionary: Dictionary,
  key: string,
  first: string,
  words: number
): Dictionary => {
  if (key === "/Type") {
    return { ...dictionary, type: words === 1 ? first : "" };
  }

  if (key === "/Parent") {
    return { ...dictionary, parented: true };
  }

  if (key === "/Count") {
    return { ...dictionary, count: direct(first, words) };
  }

  if (key === "/Length") {
    return { ...dictionary, length: direct(first, words) };
  }

  return key === "/Filter"
    ? { ...dictionary, filter: words === 1 ? first : "", filtered: true }
    : dictionary;
};

// A dictionary's keys as they are read: keys are names, and a value is
// whatever follows until the next key. A name right after a key is its
// value; any other name is the next key.
interface Keys {
  readonly dictionary: Dictionary;
  readonly first: string;
  readonly key: string;
  readonly words: number;
}

const noKeys: Keys = { dictionary: noDictionary, first: "", key: "", words: 0 };

// The keys once the one being read is over, and `next` starts.
const settled = (
  { dictionary, first, key, words }: Keys,
  next: string
): Keys => ({
  dictionary: key === "" ? dictionary : withKey(dictionary, key, first, words),
  first: "",
  key: next,
  words: 0,
});

const valued = (keys: Keys, text: string): Keys => ({
  ...keys,
  first: keys.words === 0 ? text : keys.first,
  words: keys.words + 1,
});

const named = (keys: Keys, text: string): Keys =>
  keys.key !== "" && keys.words === 0
    ? settled(valued(keys, text), "")
    : settled(keys, text);

type TokenKind = ReturnType<typeof nextToken>["kind"];

// How deep the reading is after a token: in dictionaries, and in arrays.
const depthAfter = (kind: TokenKind, depth: number): number => {
  if (kind === "open") {
    return depth + 1;
  }

  return kind === "close" ? depth - 1 : depth;
};

const arraysAfter = (kind: TokenKind, arrays: number): number => {
  if (kind === "arrayOpen") {
    return arrays + 1;
  }

  return kind === "arrayClose" ? Math.max(0, arrays - 1) : arrays;
};

interface ReadDictionary {
  readonly dictionary: Dictionary;
  readonly end: number;
}

// Reads the dictionary that opens at `start`, to its end, the file's, or
// what cannot be read through.
const readDictionary = function* readDictionary(
  bytes: Uint8Array,
  start: number
): Generator<undefined, ReadDictionary> {
  let keys = noKeys;
  let at = start + 2;
  let sliceStart = at;
  let depth = 1;
  let arrays = 0;

  while (depth > 0) {
    const token = nextToken(bytes, at);

    if (token.kind === "end" || token.kind === "overlong") {
      break;
    }

    // Its own keys and values, not those of what it holds.
    if (depth === 1 && arrays === 0 && token.kind !== "space") {
      if (token.kind === "name") {
        keys = named(keys, token.text);
      } else if (token.kind !== "close") {
        keys = valued(keys, token.text);
      }
    }

    depth = depthAfter(token.kind, depth);
    arrays = arraysAfter(token.kind, arrays);
    at = token.end;

    if (at - sliceStart >= sliceBytes) {
      sliceStart = at;
      yield;
    }
  }

  return { dictionary: settled(keys, "").dictionary, end: at };
};

// Where `sequence` next is from `from`, read a slice at a time; -1 if not.
const findSliced = function* findSliced(
  bytes: Uint8Array,
  sequence: readonly number[],
  from: number
): Generator<undefined, number> {
  for (let start = from; start < bytes.length; start += sliceBytes) {
    const found = find(
      bytes,
      sequence,
      start,
      Math.min(bytes.length, start + sliceBytes + sequence.length - 1)
    );

    if (found !== -1) {
      return found;
    }

    yield;
  }

  return -1;
};

// Where a stream's bytes end: where its dictionary's `/Length` says, when
// `endstream` is there, else at the next `endstream`. -1 when none follows.
const streamEnd = function* streamEnd(
  bytes: Uint8Array,
  start: number,
  length: Option.Option<number>
): Generator<undefined, number> {
  const told = length.pipe(
    Option.map((bytesLong) => start + bytesLong),
    Option.filter((end) =>
      startsAt(bytes, afterLineEnd(bytes, end), endStreamKeyword)
    )
  );

  return Option.isSome(told)
    ? told.value
    : yield* findSliced(bytes, endStreamKeyword, start);
};

/** An object stream's bytes, still compressed, and where they are. */
interface ObjectStream {
  readonly body: Uint8Array;
  readonly inflates: boolean;
  readonly offset: number;
}

/** The root of a page tree: where it is written, and the pages it says. */
interface PageTreeRoot {
  readonly count: Option.Option<number>;
  readonly offset: number;
}

interface Scan {
  /** Whether all of it was read: not past what cannot be read through. */
  readonly complete: boolean;
  /** The last page tree root written, if any. */
  readonly root: Option.Option<PageTreeRoot>;
  /** The object streams, in the file's order; none inside one. */
  readonly streams: readonly ObjectStream[];
}

// A page tree's root is the node of type Pages that has no parent.
const rootOf = (
  dictionary: Dictionary,
  offset: number
): Option.Option<PageTreeRoot> =>
  dictionary.type === "/Pages" && !dictionary.parented
    ? Option.some({ count: dictionary.count, offset })
    : Option.none();

// The root written last: a file saved again appends its new objects, so
// the last root is the one its readers follow.
const later = (
  one: Option.Option<PageTreeRoot>,
  other: Option.Option<PageTreeRoot>
): Option.Option<PageTreeRoot> =>
  Option.isSome(one) &&
  (Option.isNone(other) || one.value.offset >= other.value.offset)
    ? one
    : other;

const objectStreamOf = (
  dictionary: Dictionary,
  body: Uint8Array,
  offset: number
): ObjectStream => ({
  body,
  inflates: !dictionary.filtered || dictionary.filter === "/FlateDecode",
  offset,
});

// Reads the outermost dictionaries of `bytes`, which are its objects', and
// skips what streams hold: only object streams are kept (`inFile`), to be
// read once inflated. A root's place is where it is written in the file,
// or `offset`, where the object stream that holds it is. A stream that
// never ends stops the reading: nothing follows it.
const scan = function* scan(
  bytes: Uint8Array,
  offset: number,
  inFile: boolean
): Generator<undefined, Scan> {
  const streams: ObjectStream[] = [];
  let root = Option.none<PageTreeRoot>();
  let last = Option.none<Dictionary>();
  let complete = true;
  let at = 0;
  let sliceStart = 0;

  while (complete) {
    const token = nextToken(bytes, at);

    if (token.kind === "end") {
      break;
    }

    at = token.end;

    if (token.kind === "overlong") {
      complete = false;
    } else if (token.kind === "open") {
      const read = yield* readDictionary(bytes, token.start);
      const place = inFile ? token.start : offset;

      root = later(rootOf(read.dictionary, place), root);
      last = Option.some(read.dictionary);
      at = read.end;
    } else if (inFile && Option.isSome(last) && token.text === "stream") {
      const start = afterLineEnd(bytes, token.end);
      const end = yield* streamEnd(bytes, start, last.value.length);

      // Nothing can be read after a stream that does not end.
      if (end === -1) {
        break;
      }

      if (last.value.type === "/ObjStm") {
        streams.push(
          objectStreamOf(last.value, bytes.subarray(start, end), start)
        );
        complete = streams.length <= maxObjectStreams;
      }

      last = Option.none();
      at = end + endStreamKeyword.length;
    } else if (token.kind !== "space") {
      last = Option.none();
    }

    if (at - sliceStart >= sliceBytes) {
      sliceStart = at;
      yield;
    }
  }

  return { complete, root, streams };
};

// Runs a reading a slice at a time, letting other work run in between.
const sliced = <A>(reading: Generator<undefined, A>): Effect.Effect<A> =>
  Effect.gen(function* runSliced() {
    let step = reading.next();

    while (step.done !== true) {
      yield* Effect.yieldNow;
      step = reading.next();
    }

    return step.value;
  });

// An object stream's bytes in the clear. None when it does not inflate, as
// in an encrypted file, or inflates to more than `room`.
const plainOf = (stream: ObjectStream, room: number) =>
  stream.inflates && room > 0
    ? Effect.tryPromise(
        async () =>
          await inflated(stream.body, {
            maxOutputLength: Math.min(maxInflatedStream, room),
          })
      ).pipe(Effect.option)
    : Effect.succeedNone;

/**
 * How many pages a PDF has, as its page tree's root says (`/Count` of the
 * node of type Pages that has no parent), read without a PDF library. The
 * root is looked for among the file's objects, those written in the clear
 * and those inside the object streams PDF 1.5 packs them in, and the one
 * written last is taken, as a file saved several times appends its new
 * objects. What strings, comments and other streams hold is never read as
 * objects, so nothing in a page's content is counted, and pages a later
 * revision rewrote are not counted twice.
 *
 * None when the count cannot be trusted: no root, a root whose count is
 * written elsewhere, an object stream that does not inflate (as in an
 * encrypted file), more object streams or larger ones than the bounds
 * above, or a string, a name or a comment too long to read through. The
 * count only keeps out files far past what a platform takes; without one
 * the file is kept, for the platform to judge.
 *
 * The file is read once, in time that follows its size, a slice at a time
 * (`sliceBytes`): a file made to be slow to read is not, whoever waits for
 * the count can stop waiting, and the process answers its other requests
 * meanwhile. Inflating runs off the main thread, one stream at a time.
 */
export const countPdfPages = (
  bytes: Uint8Array
): Effect.Effect<Option.Option<number>> =>
  Effect.gen(function* counting() {
    const outer = yield* sliced(scan(bytes, 0, true));

    if (!outer.complete) {
      return Option.none<number>();
    }

    let { root } = outer;
    let room = maxInflatedTotal;

    for (const stream of outer.streams) {
      const plain = yield* plainOf(stream, room);

      if (Option.isNone(plain)) {
        return Option.none<number>();
      }

      room -= plain.value.length;

      const inner = yield* sliced(scan(plain.value, stream.offset, false));

      if (!inner.complete) {
        return Option.none<number>();
      }

      root = later(inner.root, root);
    }

    return root.pipe(Option.flatMap(({ count }) => count));
  });
