import { Result, Schema } from "effect";

import { InvalidReturnOrigin } from "./invalid-return-origin.ts";

/**
 * An origin a partner registered beforehand, where Peal may send its
 * customers back after a hosted page: scheme, host and port, as browsers
 * write them (`https://app.example.com`). A return address is taken only
 * when its origin is one of these, exactly: no wildcard, no subdomain
 * matching, so a hosted link never redirects anywhere the partner did not
 * name.
 */
export const ReturnOriginSchema = Schema.NonEmptyString.pipe(
  Schema.brand("ReturnOrigin")
);

export type ReturnOrigin = typeof ReturnOriginSchema.Type;

/** How many origins a partner may register. */
export const maxReturnOrigins = 20;

/** The longest return address Peal keeps. */
export const maxReturnUrlLength = 2048;

const refused = (reason: InvalidReturnOrigin["reason"]) =>
  Result.fail(new InvalidReturnOrigin({ reason }));

// The hosts that name this machine, where plain HTTP is taken so a partner
// can try the flow against its development server.
const loopbackHosts: ReadonlySet<string> = new Set([
  "localhost",
  "127.0.0.1",
  "[::1]",
]);

const parsed = (input: string): Result.Result<URL, InvalidReturnOrigin> => {
  if (input.length > maxReturnUrlLength || !URL.canParse(input)) {
    return refused("malformed");
  }

  const url = new URL(input);

  // URLs take a star in a host name; no host answers to one, and kept, it
  // would read as a pattern, which origins never are here.
  if (url.hostname.includes("*")) {
    return refused("malformed");
  }

  if (
    url.protocol !== "https:" &&
    !(url.protocol === "http:" && loopbackHosts.has(url.hostname))
  ) {
    return refused("notHttps");
  }

  if (url.username !== "" || url.password !== "") {
    return refused("credentials");
  }

  return Result.succeed(url);
};

/**
 * The origin a partner registers, as browsers write it: an HTTPS address
 * (or plain HTTP on this machine) with nothing after its host and port.
 */
export const parseReturnOrigin = (
  input: string
): Result.Result<ReturnOrigin, InvalidReturnOrigin> =>
  parsed(input.trim()).pipe(
    Result.flatMap((url) =>
      (url.pathname === "/" || url.pathname === "") &&
      url.search === "" &&
      url.hash === ""
        ? Result.succeed(ReturnOriginSchema.make(url.origin))
        : refused("notAnOrigin")
    )
  );

/**
 * The origin of a return address, when the address is one Peal could send
 * a browser to. Whether a partner registered it is `allowsReturnTo`'s to
 * say.
 */
export const originOfReturnUrl = (
  input: string
): Result.Result<ReturnOrigin, InvalidReturnOrigin> =>
  parsed(input).pipe(Result.map((url) => ReturnOriginSchema.make(url.origin)));

/** Whether `returnUrl` goes to one of the origins registered, exactly. */
export const allowsReturnTo = (
  registered: readonly ReturnOrigin[],
  returnUrl: string
): boolean =>
  Result.match(originOfReturnUrl(returnUrl), {
    onFailure: () => false,
    onSuccess: (origin) => registered.includes(origin),
  });
