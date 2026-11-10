import { Stream } from "effect";

/** A text field of a multipart form. */
export interface MultipartField {
  readonly name: string;
  readonly value: string;
}

/** The file of a multipart form, whose bytes are read as they are sent. */
export interface MultipartFile<E, R> {
  /** The file's size, which the form's length is computed from. */
  readonly byteSize: number;
  readonly bytes: Stream.Stream<Uint8Array, E, R>;
  readonly contentType: string;
  readonly fileName: string;
  readonly name: string;
}

const encoder = new TextEncoder();

// A name between quotes in a part's header, as browsers write it (the HTML
// standard's multipart/form-data encoding): line breaks and quotes are
// percent-encoded, the rest goes as UTF-8.
const quoted = (name: string) =>
  name.replaceAll("\r", "%0D").replaceAll("\n", "%0A").replaceAll('"', "%22");

/**
 * A `multipart/form-data` body (RFC 7578) with text fields and one file,
 * the file last, as a stream: the file's bytes pass through as they are
 * read, so a form with a video of any size holds a chunk of it at a time,
 * where `FormData` needs the whole file. Its length is known beforehand
 * from the file's size, for servers that refuse a body without one.
 * `boundary` must not occur in the fields; a random one never does.
 */
export const multipartBody = <E, R>(form: {
  readonly boundary: string;
  readonly fields: readonly MultipartField[];
  readonly file: MultipartFile<E, R>;
}) => {
  const { boundary, fields, file } = form;

  const head = encoder.encode(
    [
      ...fields.flatMap(({ name, value }) => [
        `--${boundary}`,
        `Content-Disposition: form-data; name="${quoted(name)}"`,
        "",
        value,
      ]),
      `--${boundary}`,
      `Content-Disposition: form-data; name="${quoted(file.name)}"; filename="${quoted(file.fileName)}"`,
      `Content-Type: ${file.contentType}`,
      "",
      "",
    ].join("\r\n")
  );

  const tail = encoder.encode(`\r\n--${boundary}--\r\n`);

  return {
    bytes: Stream.make(head).pipe(
      Stream.concat(file.bytes),
      Stream.concat(Stream.make(tail))
    ),
    contentLength: head.length + file.byteSize + tail.length,
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
};

/**
 * A boundary for a form sent for the call `key` names (its idempotency
 * key): the same for every run of the call, and nothing a member typed can
 * hold it.
 */
export const formBoundary = (key: string): string =>
  `peal-${key.replaceAll(/[^\dA-Za-z]/gu, "-").slice(0, 60)}`;
