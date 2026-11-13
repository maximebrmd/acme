// Loaded before Blume's Node build in the docs image (docs.Dockerfile, with
// node --import), to put two settings of the stack's where Blume reads
// them. Node runs this file as it is, stripping its types.
//
// The assistant's rate limit counts each reader by the first address of
// X-Forwarded-For, for requests to the docs' host name (allowedDomains in
// blume.config.ts). The edge in front sets the reader's address in one of
// the headers AUTH_IP_HEADERS names, as the server reads it:
// cf-connecting-ip behind Cloudflare, which a reader cannot set, while
// Cloudflare only appends to any X-Forwarded-For a reader sends;
// x-forwarded-for behind Caddy, which replaces it. Node announces each
// request on the http.server.request.start channel before the server's
// listeners see it: its X-Forwarded-For then becomes that address alone,
// or goes when no such header came, so the count falls back to the
// connection's address.
//
// The Turnstile secret is DOCS_TURNSTILE_SECRET_KEY in the stack's
// environment, apart from the server's TURNSTILE_SECRET_KEY (which, without
// TURNSTILE_SITE_KEY, stops the server), and Blume reads it as
// TURNSTILE_SECRET_KEY.
import { subscribe } from "node:diagnostics_channel";
import type { IncomingHttpHeaders } from "node:http";
import { IncomingMessage } from "node:http";
import process from "node:process";

const docsSecret = process.env["DOCS_TURNSTILE_SECRET_KEY"]?.trim();

if (docsSecret !== undefined && docsSecret !== "") {
  process.env["TURNSTILE_SECRET_KEY"] = docsSecret;
}

const addressHeaders = (process.env["AUTH_IP_HEADERS"] ?? "")
  .split(",")
  .map((name) => name.trim().toLowerCase())
  .filter((name) => name !== "");

// The first value of the first header named that the request carries.
const readerAddress = (headers: IncomingHttpHeaders): string | undefined =>
  addressHeaders
    .map((name) => {
      const value = headers[name];

      return (Array.isArray(value) ? value[0] : value)?.split(",")[0]?.trim();
    })
    .find((address) => address !== undefined && address !== "");

const forwardReader = (request: IncomingMessage): void => {
  const address = readerAddress(request.headers);

  if (address === undefined) {
    delete request.headers["x-forwarded-for"];
  } else {
    request.headers["x-forwarded-for"] = address;
  }
};

if (addressHeaders.length > 0) {
  subscribe("http.server.request.start", (message) => {
    if (
      message instanceof Object &&
      "request" in message &&
      message.request instanceof IncomingMessage
    ) {
      forwardReader(message.request);
    }
  });
}
