import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** How many problems an `InvalidRequest` lists at most. */
export const maxRequestIssues = 20;

/**
 * One thing wrong with a request: where, as a path from the part of the
 * request that holds it (`path`, `query`, `headers` or `body`) down to the
 * value, and what was expected there.
 */
export const RequestIssueSchema = Schema.Struct({
  message: Schema.String,
  path: Schema.Array(Schema.Union([Schema.String, Schema.Number])),
}).annotate({ identifier: "RequestIssue" });

export type RequestIssue = typeof RequestIssueSchema.Type;

/**
 * The request could not be read as its endpoint describes it: a field is
 * missing or of another type, an id is malformed, the body is not JSON.
 * Nothing was done. Every endpoint answers it, to any caller.
 */
export class InvalidRequest extends Schema.TaggedError<InvalidRequest>()(
  "InvalidRequest",
  {
    ...errorEnvelope,
    // The first problem's place, dotted (`body.targets.0.channelId`), for a
    // client that shows one.
    field: Schema.optionalKey(Schema.String),
    // The problems found, `maxRequestIssues` at most. Reading a request
    // may stop at its first problem: fixing what is listed can show more.
    issues: Schema.Array(RequestIssueSchema),
  },
  {
    description:
      "The request does not match what the endpoint takes: `issues` lists what was found wrong, each with its place in the request (`path`, `query`, `headers` or `body`, then the field), and `field` names the first. Reading may stop at the first problem. Nothing was done.",
    httpApiStatus: 400,
  }
) {}
