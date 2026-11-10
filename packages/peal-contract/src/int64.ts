import { Schema } from "effect";

// Whole numbers that can pass 2^31 - 1, which a 32-bit integer cannot hold:
// the OpenAPI document says `int64` for them, so the clients generated from
// it (Java, .NET, Rust, Go) read them into 64-bit integers rather than
// overflow. A plain `integer` is read as 32 bits there. JavaScript holds
// them exactly up to 2^53.

/**
 * A count that may be a number of bytes: what a plan allows of a limit
 * (`mediaStorage` is in bytes), and how much of it a workspace holds.
 */
export const Int64Schema = Schema.Int.check(
  Schema.makeFilter((count: number) => Number.isSafeInteger(count), {
    expected: "a whole number",
    toJsonSchema: () => ({ format: "int64" }),
  })
);

/**
 * A size in bytes, which passes 2^31 for a video (Pinterest takes 2 GiB,
 * YouTube 256 GiB) and for a workspace's media storage.
 */
export const ByteCountSchema = Schema.Int.check(
  Schema.makeFilter((bytes: number) => bytes >= 0, {
    expected: "a count of bytes",
    toJsonSchema: () => ({ format: "int64", minimum: 0 }),
  })
);
