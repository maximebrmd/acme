import { assert, describe, expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";

import {
  countPdfPages,
  isPdf,
  maxInflatedStream,
} from "#media/infrastructure/pdf-pages.ts";
import {
  compressedPdf,
  incrementallyUpdatedPdf,
  inflatingPdf,
  linearisedPdf,
  objectStreamPdf,
  pdfNamingPagesInText,
  repeatingPdf,
  syntheticPdf,
} from "#test/media/pdf.ts";

const mib = 1024 * 1024;

// How long reading `bytes` takes, in milliseconds, and how long the
// longest stretch without letting other work run was: a timer that fires
// every millisecond measures the gaps between its turns.
const timed = async (bytes: Uint8Array) => {
  let longest = 0;
  let last = performance.now();

  const timer = setInterval(() => {
    const now = performance.now();

    longest = Math.max(longest, now - last);
    last = now;
  }, 1);

  const started = performance.now();

  await Effect.runPromise(countPdfPages(bytes));

  clearInterval(timer);

  return { longest, took: performance.now() - started };
};

describe("a PDF's pages", () => {
  it.effect("are counted from its page objects", () =>
    Effect.gen(function* plain() {
      assert.deepStrictEqual(
        yield* countPdfPages(syntheticPdf(1)),
        Option.some(1)
      );
      assert.deepStrictEqual(
        yield* countPdfPages(syntheticPdf(12)),
        Option.some(12)
      );
    })
  );

  it.effect("are counted inside compressed object streams", () =>
    Effect.gen(function* compressed() {
      assert.deepStrictEqual(
        yield* countPdfPages(compressedPdf(7)),
        Option.some(7)
      );
    })
  );

  it.effect(
    "are not known when an object stream cannot be read, as in an encrypted file",
    () =>
      Effect.gen(function* unreadable() {
        const scrambled = compressedPdf(7, (plain) =>
          plain.map((byte) => byte + 1)
        );

        assert.deepStrictEqual(yield* countPdfPages(scrambled), Option.none());
      })
  );

  it.effect("are not known for a file that names none", () =>
    Effect.gen(function* none() {
      assert.deepStrictEqual(
        yield* countPdfPages(new TextEncoder().encode("%PDF-1.4\n%%EOF\n")),
        Option.none()
      );
    })
  );

  it.effect(
    "are those its page tree says, not every mention of a page in its text",
    () =>
      Effect.gen(function* inText() {
        assert.deepStrictEqual(
          yield* countPdfPages(pdfNamingPagesInText()),
          Option.some(1)
        );
      })
  );

  it.effect("are those of its last revision, when it was saved again", () =>
    Effect.gen(function* updated() {
      // 200 pages, then 250: 450 page objects in the file, 250 pages.
      assert.deepStrictEqual(
        yield* countPdfPages(incrementallyUpdatedPdf(200, 250)),
        Option.some(250)
      );
    })
  );

  it.effect("are counted in a linearised file, by its tree's root", () =>
    Effect.gen(function* linearised() {
      assert.deepStrictEqual(
        yield* countPdfPages(linearisedPdf(40)),
        Option.some(40)
      );
    })
  );

  it.effect(
    "are counted when the whole page tree is inside object streams",
    () =>
      Effect.gen(function* packed() {
        assert.deepStrictEqual(
          yield* countPdfPages(objectStreamPdf(250)),
          Option.some(250)
        );
        assert.deepStrictEqual(
          yield* countPdfPages(objectStreamPdf(12, 5)),
          Option.some(12)
        );
      })
  );

  it.effect(
    "are not known when an object stream inflates to more than is read",
    () =>
      Effect.gen(function* bomb() {
        assert.deepStrictEqual(
          yield* countPdfPages(inflatingPdf(maxInflatedStream / mib + 1)),
          Option.none()
        );
      })
  );

  it("belong to a file that starts as a PDF does", () => {
    assert.isTrue(isPdf(syntheticPdf(1)));
    // A few bytes may come before the header.
    assert.isTrue(
      isPdf(new TextEncoder().encode("\n\n%PDF-1.7\n1 0 obj\nendobj\n"))
    );
    assert.isFalse(isPdf(new TextEncoder().encode("<svg></svg>")));
    assert.isFalse(isPdf(new Uint8Array([0x89, 0x50, 0x4e, 0x47])));
  });

  // Files made to be slow: each repeats what once made the reader start
  // over from every occurrence. Read once, 8 MiB take about as long as
  // any other 8 MiB, and the reader never holds the process.
  it.each([
    ["object streams that never start", "/Type/ObjStm "],
    ["dictionaries that never end", "<< /Type /ObjStm "],
    ["streams that never end", "<< /Type /ObjStm >> stream\n"],
    ["strings that never end", "(("],
    ["names without end", "/Type"],
  ])(
    "are read in a time that follows the file's size: %s",
    async (_, pattern) => {
      const { longest, took } = await timed(repeatingPdf(pattern, 8 * mib));

      expect(took).toBeLessThan(5000);
      expect(longest).toBeLessThan(500);
    },
    30_000
  );

  it("stop being counted when whoever waits stops waiting", async () => {
    // About two seconds of reading, were nobody to stop it.
    const slow = repeatingPdf("<< /Type /ObjStm ", 64 * mib);
    const started = performance.now();

    const outcome = await Effect.runPromise(
      countPdfPages(slow).pipe(
        Effect.as("counted" as const),
        Effect.timeoutOrElse({
          duration: "20 millis",
          orElse: () => Effect.succeed("timedOut" as const),
        })
      )
    );

    expect(outcome).toBe("timedOut");
    expect(performance.now() - started).toBeLessThan(1000);
  }, 30_000);
});
