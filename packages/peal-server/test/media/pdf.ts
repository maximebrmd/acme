import { deflateSync } from "node:zlib";

const encoder = new TextEncoder();

const joined = (parts: readonly Uint8Array[]): Uint8Array<ArrayBuffer> => {
  const whole = new Uint8Array(
    parts.reduce((length, part) => length + part.length, 0)
  );

  let at = 0;

  for (const part of parts) {
    whole.set(part, at);
    at += part.length;
  }

  return whole;
};

const kids = (pages: number, first: number) =>
  Array.from({ length: pages }, (_, index) => `${first + index} 0 R`).join(" ");

const pageObject = (number: number) =>
  `${number} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n`;

/**
 * A synthetic PDF of `pages` blank pages, its objects written in the
 * clear, as PDF 1.4 does. Enough of a PDF for the probe, which reads its
 * header and counts its page objects; no viewer is asked to open it.
 */
export const syntheticPdf = (pages: number): Uint8Array<ArrayBuffer> =>
  encoder.encode(
    [
      "%PDF-1.4\n",
      "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
      `2 0 obj\n<< /Type /Pages /Count ${pages} /Kids [${kids(pages, 3)}] >>\nendobj\n`,
      ...Array.from({ length: pages }, (_, index) => pageObject(index + 3)),
      "trailer\n<< /Root 1 0 R >>\n%%EOF\n",
    ].join("")
  );

/**
 * The same, as PDF 1.5 and later write it: the page objects inside an
 * object stream, compressed (or left as `stream` gives them, to play a
 * stream that cannot be read).
 */
export const compressedPdf = (
  pages: number,
  stream: (plain: Uint8Array) => Uint8Array = (plain) => deflateSync(plain)
): Uint8Array<ArrayBuffer> => {
  const objects = Array.from(
    { length: pages },
    () => "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>"
  ).join("\n");

  const body = stream(encoder.encode(objects));

  return joined([
    encoder.encode(
      [
        "%PDF-1.7\n",
        "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
        `2 0 obj\n<< /Type /Pages /Count ${pages} /Kids [${kids(pages, 4)}] >>\nendobj\n`,
        `3 0 obj\n<< /Type /ObjStm /N ${pages} /First 0 /Filter /FlateDecode /Length ${body.length} >>\nstream\n`,
      ].join("")
    ),
    body,
    encoder.encode("\nendstream\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n"),
  ]);
};

const text = (parts: readonly string[]): Uint8Array<ArrayBuffer> =>
  encoder.encode(parts.join(""));

/**
 * One page whose content and comments name page objects that are none: a
 * string and a comment are not objects.
 */
export const pdfNamingPagesInText = (): Uint8Array<ArrayBuffer> =>
  text([
    "%PDF-1.4\n",
    "% << /Type /Page >> is how a page is written\n",
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>\nendobj\n",
    "4 0 obj\n<< /Length 34 >>\nstream\n(<< /Type /Page >> /Type /Pages) Tj\nendstream\nendobj\n",
    "5 0 obj\n<< /Title (About << /Type /Page >> and \\) /Type /Page) >>\nendobj\n",
    "trailer\n<< /Root 1 0 R /Info 5 0 R >>\n%%EOF\n",
  ]);

/**
 * A file saved again after pages were added, as editors do: the new page
 * tree root and the pages it rewrote are appended, and the old ones stay.
 */
export const incrementallyUpdatedPdf = (
  before: number,
  after: number
): Uint8Array<ArrayBuffer> =>
  text([
    "%PDF-1.4\n",
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    `2 0 obj\n<< /Type /Pages /Count ${before} /Kids [${kids(before, 3)}] >>\nendobj\n`,
    ...Array.from({ length: before }, (_, index) => pageObject(index + 3)),
    "trailer\n<< /Root 1 0 R >>\nstartxref\n0\n%%EOF\n",
    // The update: the root again, every page rewritten, and the new ones.
    `2 0 obj\n<< /Type /Pages /Count ${after} /Kids [${kids(after, 3)}] >>\nendobj\n`,
    ...Array.from({ length: after }, (_, index) => pageObject(index + 3)),
    "trailer\n<< /Root 1 0 R /Prev 0 >>\nstartxref\n0\n%%EOF\n",
  ]);

/**
 * A linearised file, as made for reading over a network: its first page's
 * objects come first, after the linearisation dictionary, and the page
 * tree, with a node between its root and its pages, comes after.
 */
export const linearisedPdf = (pages: number): Uint8Array<ArrayBuffer> =>
  text([
    "%PDF-1.4\n",
    `1 0 obj\n<< /Linearized 1 /L 4096 /O 4 /E 512 /N ${pages} /T 2048 >>\nendobj\n`,
    "2 0 obj\n<< /Type /Catalog /Pages 3 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Page /Parent 5 0 R /MediaBox [0 0 612 792] >>\nendobj\n",
    `5 0 obj\n<< /Type /Pages /Parent 3 0 R /Count ${pages} /Kids [${kids(pages, 6)}] >>\nendobj\n`,
    `3 0 obj\n<< /Kids [5 0 R] /Count ${pages} /Type /Pages >>\nendobj\n`,
    ...Array.from(
      { length: pages - 1 },
      (_, index) =>
        `${index + 6} 0 obj\n<< /Type /Page /Parent 5 0 R /MediaBox [0 0 612 792] >>\nendobj\n`
    ),
    "trailer\n<< /Root 2 0 R >>\n%%EOF\n",
  ]);

/**
 * A file as PDF 1.5 and later write it whole: the catalog, the page tree
 * and the pages inside compressed object streams, `perStream` objects in
 * each, with nothing of them in the clear.
 */
export const objectStreamPdf = (
  pages: number,
  perStream = 100
): Uint8Array<ArrayBuffer> => {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Count ${pages} /Kids [${kids(pages, 3)}] >>`,
    ...Array.from(
      { length: pages },
      () => "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>"
    ),
  ];

  const streams = Array.from(
    { length: Math.ceil(objects.length / perStream) },
    (_, index) => objects.slice(index * perStream, (index + 1) * perStream)
  );

  return joined([
    encoder.encode("%PDF-1.7\n"),
    ...streams.flatMap((held, index) => {
      // The stream's index: each object's number and where it starts.
      const offsets = held.map((_, at) =>
        held
          .slice(0, at)
          .reduce((length, object) => length + object.length + 1, 0)
      );

      const index_ = held
        .map((_, at) => `${index * perStream + at + 1} ${offsets[at] ?? 0}`)
        .join(" ");

      const body = deflateSync(encoder.encode(`${index_}\n${held.join("\n")}`));

      return [
        encoder.encode(
          `${1000 + index} 0 obj\n<< /Type /ObjStm /N ${held.length} /First ${index_.length + 1} /Filter /FlateDecode /Length ${body.length} >>\nstream\n`
        ),
        body,
        encoder.encode("\nendstream\nendobj\n"),
      ];
    }),
    encoder.encode("startxref\n0\n%%EOF\n"),
  ]);
};

/** A file whose one object stream inflates to `megabytes` of nothing. */
export const inflatingPdf = (megabytes: number): Uint8Array<ArrayBuffer> => {
  const body = deflateSync(new Uint8Array(megabytes * 1024 * 1024).fill(32));

  return joined([
    encoder.encode(
      [
        "%PDF-1.7\n",
        "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
        "2 0 obj\n<< /Type /Pages /Count 1 /Kids [4 0 R] >>\nendobj\n",
        `3 0 obj\n<< /Type /ObjStm /N 1 /First 0 /Filter /FlateDecode /Length ${body.length} >>\nstream\n`,
      ].join("")
    ),
    body,
    encoder.encode("\nendstream\nendobj\n%%EOF\n"),
  ]);
};

/**
 * Bytes that start as a PDF does and then repeat `pattern` to `length`:
 * files made to be slow to read.
 */
export const repeatingPdf = (
  pattern: string,
  length: number
): Uint8Array<ArrayBuffer> => {
  const start = encoder.encode("%PDF-1.7\n");
  const repeated = encoder.encode(pattern);
  const whole = new Uint8Array(length);

  whole.set(start, 0);

  for (let at = start.length; at < length; at += repeated.length) {
    whole.set(repeated.subarray(0, length - at), at);
  }

  return whole;
};
