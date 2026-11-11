import { Schema } from "effect";

import { maxEndpointHeaders } from "./delivery-policy.ts";
import { SealedSecretSchema } from "./sealed-secret.ts";

// The headers a receiver asks every delivery to carry, as a gateway in
// front of it may want a token: static, chosen by the endpoint's managers,
// sent beside Peal's own and never in their place. Their values are the
// receiver's secrets: sealed at rest, never shown again, never logged.

export const maxHeaderNameLength = 64;

export const maxHeaderValueLength = 1024;

// An HTTP field name is a token (RFC 9110, section 5.1).
const token = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/u;

/**
 * Names an endpoint may not set, compared without case: those Peal sets
 * itself, those that describe the message or its connection, and the
 * hop-by-hop fields of RFC 9110, section 7.6.1. Any `webhook-` name too,
 * which the Standard Webhooks specification keeps.
 */
export const refusedHeaderNames: readonly string[] = [
  "connection",
  "content-length",
  "content-type",
  "cookie",
  "host",
  "keep-alive",
  "proxy-connection",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "user-agent",
];

export const refusedHeaderPrefix = "webhook-";

/** Whether an endpoint may set a header of this name. */
export const isAllowedHeaderName = (name: string): boolean => {
  const lowered = name.toLowerCase();

  return (
    !lowered.startsWith(refusedHeaderPrefix) &&
    !refusedHeaderNames.includes(lowered)
  );
};

/** A header's name, as its endpoint's managers wrote it. */
export const HeaderNameSchema = Schema.String.check(
  Schema.isBetweenLength(1, maxHeaderNameLength),
  Schema.isPattern(token),
  Schema.makeFilter(
    (name) =>
      isAllowedHeaderName(name) || "Peal sets this header, or none may set it"
  )
);

/**
 * A header's value: visible ASCII, spaces inside it but at neither end, no
 * line break, so nothing can be added to the request around it.
 */
export const HeaderValueSchema = Schema.String.check(
  Schema.isBetweenLength(1, maxHeaderValueLength),
  Schema.isPattern(/^[\u0021-\u007E](?:[\u0020-\u007E]*[\u0021-\u007E])?$/u)
);

/** A header an endpoint's deliveries carry, its value in the clear. */
export const EndpointHeaderSchema = Schema.Struct({
  name: HeaderNameSchema,
  value: HeaderValueSchema,
});

export type EndpointHeader = typeof EndpointHeaderSchema.Type;

/** Whether no name comes twice, compared without case. */
export const namesOnce = (names: readonly string[]): boolean =>
  new Set(names.map((name) => name.toLowerCase())).size === names.length;

/** An endpoint's headers: `maxEndpointHeaders` at most, each name once. */
export const EndpointHeadersSchema = Schema.Array(EndpointHeaderSchema).check(
  Schema.isMaxLength(maxEndpointHeaders),
  Schema.makeFilter(
    (headers) =>
      namesOnce(headers.map(({ name }) => name)) ||
      "Each header is named once, whatever its case"
  )
);

export type EndpointHeaders = typeof EndpointHeadersSchema.Type;

/**
 * A header in a change of the endpoint's list: with its value, or without
 * one to keep the value the endpoint has under that name, whatever its case.
 */
export const HeaderChangeSchema = Schema.Struct({
  name: HeaderNameSchema,
  value: Schema.optionalKey(HeaderValueSchema),
});

export type HeaderChange = typeof HeaderChangeSchema.Type;

/** A change's whole list: as `EndpointHeadersSchema`, values optional. */
export const HeaderChangesSchema = Schema.Array(HeaderChangeSchema).check(
  Schema.isMaxLength(maxEndpointHeaders),
  Schema.makeFilter(
    (headers) =>
      namesOnce(headers.map(({ name }) => name)) ||
      "Each header is named once, whatever its case"
  )
);

/** The names of an endpoint's headers, as it shows them. */
export const HeaderNamesSchema = Schema.Array(HeaderNameSchema).check(
  Schema.isMaxLength(maxEndpointHeaders)
);

/** A header as stored: its name, and its value sealed to its endpoint. */
export const SealedHeaderSchema = Schema.Struct({
  name: HeaderNameSchema,
  sealed: SealedSecretSchema,
});

export type SealedHeader = typeof SealedHeaderSchema.Type;
