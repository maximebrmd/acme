import { Option } from "effect";

const web = /^https?:\/\//iu;

/**
 * An address a platform gave for a post, a comment or a reply, when it is
 * one a link may open: http or https. Platforms say them, so anything else
 * is left out rather than linked.
 */
export const webAddressOf = (address: string | null): Option.Option<string> =>
  Option.fromNullOr(address).pipe(Option.filter((value) => web.test(value)));
