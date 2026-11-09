import type { Option } from "effect";
import { Schema } from "effect";

// A path on this site: one slash, then anything but a second slash or a
// backslash (which browsers read as another host), and no whitespace.
const NextPathSchema = Schema.String.check(
  Schema.isPattern(/^\/(?![/\\])\S*$/u)
);

const decodeNextPath = Schema.decodeUnknownOption(NextPathSchema);

/**
 * Where to go after signing in, from a page's `next` query parameter: a
 * path on this site, never another one, so a link cannot send people away.
 */
export const nextPathOf = (
  value: string | readonly string[] | undefined
): Option.Option<string> => decodeNextPath(value);
