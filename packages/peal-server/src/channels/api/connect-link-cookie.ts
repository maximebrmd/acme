import { Duration, Option, Redacted } from "effect";
import { connectLinkCookie } from "peal-contract";

/**
 * How long a browser keeps the nonce of the sign-in it started: as long as
 * a sign-in may take, with the choice of accounts that may follow it.
 */
export const cookieLifetime = Duration.minutes(30);

/**
 * The cookie that makes a browser the one that completes the sign-in it
 * started through a connect link: not readable by scripts (`HttpOnly`),
 * sent to the hosted endpoints alone (`Path`), never with another site's
 * request (`SameSite=Lax`), and over HTTPS only where the pages are
 * (`Secure`).
 */
export const cookieOf = (nonce: Redacted.Redacted, secure: boolean): string =>
  [
    `${connectLinkCookie}=${Redacted.value(nonce)}`,
    "Path=/api/connect-links",
    `Max-Age=${String(Duration.toSeconds(cookieLifetime))}`,
    "HttpOnly",
    "SameSite=Lax",
    ...(secure ? ["Secure"] : []),
  ].join("; ");

/** The nonce a request's cookies hold, if they hold one. */
export const nonceOf = (
  cookies: Readonly<Record<string, string | undefined>>
): Option.Option<Redacted.Redacted> =>
  Option.fromUndefinedOr(cookies[connectLinkCookie]).pipe(
    Option.filter((nonce) => nonce !== ""),
    Option.map((nonce) => Redacted.make(nonce))
  );
