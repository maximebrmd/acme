import { assert, describe, it } from "@effect/vitest";
import { Effect, Option } from "effect";

import { countPdfPages, isPdf } from "#media/infrastructure/pdf-pages.ts";
import { compressedPdf, syntheticPdf } from "#test/media/pdf.ts";

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

  it("belong to a file that starts as a PDF does", () => {
    assert.isTrue(isPdf(syntheticPdf(1)));
    // A few bytes may come before the header.
    assert.isTrue(
      isPdf(new TextEncoder().encode("\n\n%PDF-1.7\n1 0 obj\nendobj\n"))
    );
    assert.isFalse(isPdf(new TextEncoder().encode("<svg></svg>")));
    assert.isFalse(isPdf(new Uint8Array([0x89, 0x50, 0x4e, 0x47])));
  });
});
