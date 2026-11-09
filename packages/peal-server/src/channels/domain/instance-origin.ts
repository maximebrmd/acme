import { Result, Schema } from "effect";

import { InvalidInstance } from "./invalid-instance.ts";

/**
 * The origin of a server an account lives on, such as
 * "https://mastodon.social": scheme, host and port, in the canonical form URL
 * writes them. Whether Acme may call it is the outbound policy's decision.
 */
export const InstanceOriginSchema = Schema.NonEmptyString.pipe(
  Schema.brand("InstanceOrigin")
);

export type InstanceOrigin = typeof InstanceOriginSchema.Type;

const webProtocols: ReadonlySet<string> = new Set(["http:", "https:"]);

// "@alice@mastodon.social" or "alice@mastodon.social": an account's address,
// whose server is after the last @.
const accountAddress = /^@?[^\s/@]+@(?<host>[^\s/@]+)$/u;

const schemePrefix = /^[a-z][\d+.a-z-]*:\/\//iu;

/**
 * The server a person means by what they typed: a host name
 * ("mastodon.social"), a URL on it, of which only the origin counts
 * ("https://mastodon.social/@alice"), or an account's address
 * ("@alice@mastodon.social"). Without a scheme, HTTPS is meant. A URL with a
 * user name or password is refused rather than stripped, and a host's
 * final dot dropped.
 */
export const parseInstance = (
  input: string
): Result.Result<InstanceOrigin, InvalidInstance> => {
  const trimmed = input.trim();
  const host = accountAddress.exec(trimmed)?.groups?.["host"];
  const candidate = host ?? trimmed;

  const url = URL.parse(
    schemePrefix.test(candidate) ? candidate : `https://${candidate}`
  );

  // "mastodon.social." is the same server as "mastodon.social", and its
  // accounts the same accounts.
  const hostname = url?.hostname.replace(/\.$/u, "") ?? "";

  if (
    url === null ||
    !webProtocols.has(url.protocol) ||
    hostname === "" ||
    url.username !== "" ||
    url.password !== ""
  ) {
    return Result.fail(new InvalidInstance());
  }

  url.hostname = hostname;

  return Result.succeed(InstanceOriginSchema.make(url.origin));
};
