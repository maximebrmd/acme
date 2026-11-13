import { Layer } from "effect";
import { HttpMiddleware } from "effect/http";

// No server span for these: the HTTP tracer records `url.full`, the
// visitor's browser and address. A short link's redirect would keep what
// the privacy register says Peal never keeps (counted in
// `peal.shortlinks.redirects` instead); the weekly digest's unsubscribe
// link would keep its token, a capability that never expires.
const untracedPrefixes = [
  "/api/l/",
  "/api/notifications/weekly-digest/unsubscribe/",
];

/** Whether the HTTP tracer leaves the request at this address out. */
export const isUntraced = (url: string): boolean =>
  untracedPrefixes.some((prefix) => url.startsWith(prefix));

/** The tracer's exception for those paths, for the routes' layer. */
export const UntracedPathsLive = Layer.succeed(
  HttpMiddleware.TracerDisabledWhen
)((request) => isUntraced(request.url));
