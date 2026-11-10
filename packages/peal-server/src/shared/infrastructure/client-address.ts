import { Config, Option, Schema } from "effect";
import type { HttpServerRequest } from "effect/http";

import { requiredInProduction } from "./environment.ts";

// Where a request came from, for the limits on what needs no sign-in: the
// web app's error reports, and what the visitors of review links write.

// The headers that carry the client's address: those sign-in rate limits
// read (AUTH_IP_HEADERS), which the edge sets and overwrites.
export const addressHeadersConfig = requiredInProduction(
  Config.Array(Schema.String, "AUTH_IP_HEADERS"),
  ["x-forwarded-for"]
).pipe(
  Config.map((names) =>
    names.flatMap((name) => {
      const header = name.trim().toLowerCase();

      return header === "" ? [] : [header];
    })
  )
);

const longestAddress = 100;

/**
 * Who sent a request, for counting: the first address header present, else
 * the connection's address. Reports from the web app's own server count as
 * its address.
 */
export const addressOf = (
  request: HttpServerRequest.HttpServerRequest,
  headers: readonly string[]
): string => {
  for (const header of headers) {
    const value = request.headers[header]?.trim();

    if (value !== undefined && value !== "") {
      return value.slice(0, longestAddress);
    }
  }

  return Option.getOrElse(request.remoteAddress, () => "unknown");
};
