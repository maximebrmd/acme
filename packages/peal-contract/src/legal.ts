import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";

import { StaffAccess } from "./staff-access.ts";

/**
 * The longest authority, reference or legal basis staff may write for a
 * legal request.
 */
export const maxLegalTextLength = 300;

/** How many years the record of each answer to a legal request is kept. */
export const legalDisclosureYears = 5;

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

/**
 * What a legal request may ask for, by the categories of décret
 * n° 2021-1362: `identity`, who held a closed account (its name, email
 * address and creation date); `signIn`, the identifiers it signed in with;
 * `payments`, the Stripe customers that find its payments; `connections`,
 * each connection that created, changed or deleted content.
 */
export const LegalCoverSchema = Schema.Literals([
  "identity",
  "signIn",
  "payments",
  "connections",
]).annotate({ identifier: "LegalCover" });

export type LegalCover = typeof LegalCoverSchema.Type;

/** A legal request, as staff enter it from the authority's document. */
export const LegalRequestSchema = Schema.Struct({
  // The authority that asked: a court, a public prosecutor, a police or
  // gendarmerie service acting on their instructions.
  authority: LegalTextSchema,
  // What the request asks for: the answer holds nothing else.
  covers: Schema.Array(LegalCoverSchema).check(
    Schema.isMinLength(1),
    Schema.isMaxLength(4)
  ),
  // The text that gives the authority the power to ask, as its document
  // cites it: an article of the code de procédure pénale, for instance.
  legalBasis: LegalTextSchema,
  // The request's reference: its number, the procedure, its date.
  reference: LegalTextSchema,
  // The period of the connections it asks for, when it names one: from
  // `since`, to `until`, both included.
  since: Schema.optionalKey(Schema.DateTimeUtc),
  subject: LegalSubjectSchema,
  until: Schema.optionalKey(Schema.DateTimeUtc),
}).annotate({ identifier: "LegalRequest" });

export type LegalRequest = typeof LegalRequestSchema.Type;

/**
 * What a request got of a closed account, as Peal keeps it for the law:
 * its id and when it closed, and each category the request covered, null
 * for one it did not. 5 years after it closed, who held it; 1 year, how it
 * signed in (each provider's account id, never a password) and the Stripe
 * customers that find its payments, which are empty after that.
 */
export const LegalHeldAccountSchema = Schema.Struct({
  closedAt: Schema.DateTimeUtc,
  identity: Schema.NullOr(
    Schema.Struct({
      accountCreatedAt: Schema.DateTimeUtc,
      email: Schema.String,
      name: Schema.String,
    })
  ),
  signInMethods: Schema.NullOr(
    Schema.Array(
      Schema.Struct({ accountId: Schema.String, provider: Schema.String })
    )
  ),
  stripeCustomerIds: Schema.NullOr(Schema.Array(Schema.String)),
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

/**
 * What a legal request got, and the id of its record. `connections` is
 * null when the request did not cover them.
 */
export const LegalAnswerSchema = Schema.Struct({
  at: Schema.DateTimeUtc,
  connections: Schema.NullOr(Schema.Array(LegalConnectionSchema)),
  held: Schema.Array(LegalHeldAccountSchema),
  id: Schema.String,
}).annotate({ identifier: "LegalAnswer" });

export type LegalAnswer = typeof LegalAnswerSchema.Type;

/**
 * An answer given to a legal request, as it was recorded: who gave it and
 * when, the authority, its reference and legal basis, what it asked about
 * and for, and how many closed accounts and connections it got. Never the
 * data handed over.
 */
export const LegalDisclosureSchema = Schema.Struct({
  at: Schema.DateTimeUtc,
  authority: Schema.String,
  connections: Schema.Int,
  covers: Schema.Array(LegalCoverSchema),
  held: Schema.Int,
  id: Schema.String,
  legalBasis: Schema.String,
  reference: Schema.String,
  since: Schema.NullOr(Schema.DateTimeUtc),
  // The staff member who answered.
  staffId: Schema.String,
  subject: LegalSubjectSchema,
  until: Schema.NullOr(Schema.DateTimeUtc),
}).annotate({ identifier: "LegalDisclosure" });

export type LegalDisclosure = typeof LegalDisclosureSchema.Type;

/** A page of the answers given, newest first. */
export const LegalDisclosurePageSchema = Schema.Struct({
  items: Schema.Array(LegalDisclosureSchema),
  page: Schema.Int,
  pageSize: Schema.Int,
  // Rows across every page.
  total: Schema.Int,
}).annotate({ identifier: "LegalDisclosurePage" });

export type LegalDisclosurePage = typeof LegalDisclosurePageSchema.Type;

/**
 * Legal requests, for the people who run the server: the only way to read
 * what the law has Peal keep after an account closes, and the connections
 * that made content. Every answer is recorded with the staff member, the
 * authority, its reference and legal basis, and what it covered. It
 * answers 404 to anyone but staff in their own session who hold the legal
 * role.
 */
export class LegalApi extends HttpApiGroup.make("legal")
  .add(
    HttpApiEndpoint.post("answer", "/legal-requests", {
      payload: LegalRequestSchema,
      success: LegalAnswerSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Answers a request from a judicial authority for the data that identifies who contributed content (loi n° 2004-575, art. 6, V, B; décret n° 2021-1362): the closed accounts the subject names, with who held them and, for a year after closing, how they signed in and paid; and the connections that created, changed or deleted content, of those accounts, of the account named, or in the workspace named, for a year after each, within the period the request names. Only the categories in `covers` are answered; the others come back null. The answer is recorded first, with who asked for it, the authority, its reference, its legal basis and what it covered. Enter only a request a judicial authority made in writing.",
        summary: "Answer a legal request",
      })
    ),
    HttpApiEndpoint.get("answered", "/legal-requests", {
      query: {
        // From 1.
        page: Schema.optionalKey(
          Schema.Int.check(Schema.isBetween({ maximum: 10_000, minimum: 1 }))
        ),
      },
      success: LegalDisclosurePageSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Lists the answers given to legal requests, newest first, 25 a page: who answered, when, the authority, its reference and legal basis, what it asked about and for, and how many records it got. Never the data handed over. Each is kept 5 years.",
        summary: "List the legal requests answered",
      })
    ),
    HttpApiEndpoint.get("standing", "/legal-requests/standing", {
      success: HttpApiSchema.NoContent,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Answers 204 to staff who hold the legal role, and 404 to anyone else, so the console shows its legal requests page to them alone.",
        summary: "Whether I answer legal requests",
      })
    )
  )
  .middleware(StaffAccess)
  .prefix("/api/admin") {}
