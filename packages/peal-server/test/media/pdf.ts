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
