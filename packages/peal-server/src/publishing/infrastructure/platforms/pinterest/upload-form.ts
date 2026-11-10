import { Stream } from "effect";

// A multipart form (RFC 7578) whose last part is a file read from a
// stream, with its exact length known beforehand: the text fields first,
// in the order given, as the object stores that take such forms ask.

/** The file a form ends with. */
export interface FormFile<E> {
  readonly bytes: Stream.Stream<Uint8Array, E>;
  readonly byteSize: number;
  readonly contentType: string;
  readonly fileName: string;
}

/** A form's body, its length and its `Content-Type`. */
export interface UploadForm<E> {
  readonly body: Stream.Stream<Uint8Array, E>;
  readonly contentLength: number;
  readonly contentType: string;
}

const encoder = new TextEncoder();

// A quote or a line break would end a header's value early.
const headerSafe = (value: string) => value.replaceAll(/["\r\n]/gu, "_");

/**
 * The form holding `fields`, then `file` under the name `file`. `boundary`
 * separates the parts: letters, digits and hyphens that the fields do not
 * hold.
 */
export const uploadForm = <E>(form: {
  readonly boundary: string;
  readonly fields: Readonly<Record<string, string>>;
  readonly file: FormFile<E>;
}): UploadForm<E> => {
  const { boundary, fields, file } = form;

  const head = encoder.encode(
    [
      ...Object.entries(fields).map(
        ([name, value]) =>
          `--${boundary}\r\nContent-Disposition: form-data; name="${headerSafe(name)}"\r\n\r\n${value}\r\n`
      ),
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${headerSafe(file.fileName)}"\r\nContent-Type: ${headerSafe(file.contentType)}\r\n\r\n`,
    ].join("")
  );

  const tail = encoder.encode(`\r\n--${boundary}--\r\n`);

  return {
    body: Stream.make(head).pipe(
      Stream.concat(file.bytes),
      Stream.concat(Stream.make(tail))
    ),
    contentLength: head.byteLength + file.byteSize + tail.byteLength,
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
};
