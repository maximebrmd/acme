import { Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/http-api";

import { StaffAccess } from "./staff-access.ts";

/** The longest authority or reference staff may write for a legal request. */
export const maxLegalTextLength = 300;

const LegalTextSchema = Schema.Trim.check(
  Schema.isNonEmpty(),
  Schema.isMaxLength(maxLegalTextLength)
);

/**
 * What a legal request asks about: the closed accounts with this email
 * address, the account with this id (closed or not), or the workspace
 * with this id.
 */
export const LegalSubjectSchema = Schema.Union([
  Schema.Struct({ email: Schema.String.check(Schema.isMaxLength(320)) }),
  Schema.Struct({ userId: Schema.String.check(Schema.isMaxLength(64)) }),
  Schema.Struct({ workspaceId: Schema.String.check(Schema.isMaxLength(64)) }),
]).annotate({ identifier: "LegalSubject" });

export type LegalSubject = typeof LegalSubjectSchema.Type;

/** A legal request, as staff enter it from the authority's document. */
export const LegalRequestSchema = Schema.Struct({
  // The authority that asked: a court, a public prosecutor, a police or
  // gendarmerie service acting on their instructions.
  authority: LegalTextSchema,
  // The request's reference: its number, the procedure, its date.
  reference: LegalTextSchema,
  subject: LegalSubjectSchema,
}).annotate({ identifier: "LegalRequest" });

export type LegalRequest = typeof LegalRequestSchema.Type;

/**
 * Who held a closed account, as Peal keeps it for the law: 5 years after
 * it closed, the name and address; 1 year, how it signed in (each
 * provider's account id, never a password) and the Stripe customers that
 * find its payments, which are empty after that.
 */
export const LegalHeldAccountSchema = Schema.Struct({
  accountCreatedAt: Schema.DateTimeUtc,
  closedAt: Schema.DateTimeUtc,
  email: Schema.String,
  name: Schema.String,
  signInMethods: Schema.Array(
    Schema.Struct({ accountId: Schema.String, provider: Schema.String })
  ),
  stripeCustomerIds: Schema.Array(Schema.String),
  userId: Schema.String,
}).annotate({ identifier: "LegalHeldAccount" });

/**
 * A connection that created, changed or deleted content: when, from which
 * address, over which protocol, how it authenticated (`session`, `apiKey`,
 * `oauth` or `mcp`), by whom and in which workspace.
 */
export const LegalConnectionSchema = Schema.Struct({
  access: Schema.String,
  apiKeyId: Schema.NullOr(Schema.String),
  at: Schema.DateTimeUtc,
  ipAddress: Schema.NullOr(Schema.String),
  protocol: Schema.String,
  userId: Schema.NullOr(Schema.String),
  workspaceId: Schema.NullOr(Schema.String),
}).annotate({ identifier: "LegalConnection" });

/** What a legal request got, and the id of its record. */
export const LegalAnswerSchema = Schema.Struct({
  at: Schema.DateTimeUtc,
  connections: Schema.Array(LegalConnectionSchema),
  held: Schema.Array(LegalHeldAccountSchema),
  id: Schema.String,
}).annotate({ identifier: "LegalAnswer" });

export type LegalAnswer = typeof LegalAnswerSchema.Type;

/**
 * Legal requests, for the people who run the server: the only way to read
 * what the law has Peal keep after an account closes, and the connections
 * that made content. Every answer is recorded with the staff member, the
 * authority and its reference. It answers 404 to anyone but staff in their
 * own session.
 */
export class LegalApi extends HttpApiGroup.make("legal")
  .add(
    HttpApiEndpoint.post("answer", "/legal-requests", {
      payload: LegalRequestSchema,
      success: LegalAnswerSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Answers a request from a judicial authority for the data that identifies who contributed content (loi n° 2004-575, art. 6, V, B; décret n° 2021-1362): the closed accounts the subject names, with who held them and, for a year after closing, how they signed in; and the connections that created, changed or deleted content, of those accounts, of the account named, or in the workspace named, for a year after each. The answer is recorded first, with who asked for it, the authority and its reference. Enter only a request a judicial authority made in writing.",
        summary: "Answer a legal request",
      })
    )
  )
  .middleware(StaffAccess)
  .prefix("/api/admin") {}
