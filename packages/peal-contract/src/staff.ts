import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";

import { PlanSchema } from "./billing-plans.ts";
import { BillingSubscriptionSchema } from "./billing.ts";
import { ChannelStatusSchema } from "./channels.ts";
import { PlatformSchema } from "./platform.ts";
import { FailureReasonSchema, UnconfirmedReasonSchema } from "./posts.ts";
import { StaffAccess } from "./staff-access.ts";
import { StaffActionRefused } from "./staff-action-refused.ts";
import { UserNotFound } from "./user-not-found.ts";
import { WorkspaceNotFound } from "./workspace-not-found.ts";

/** How many rows a page of the staff console's lists holds. */
export const staffPageSize = 25;

/** The longest reason staff may give for an action. */
export const maxStaffReasonLength = 500;

const pageQuery = {
  // From 1.
  page: Schema.optionalKey(
    Schema.Int.check(Schema.isBetween({ maximum: 10_000, minimum: 1 }))
  ),
};

const searchQuery = {
  ...pageQuery,
  // Part of an email, a name, a slug, or a whole id.
  query: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(200))),
};

const pageOf = <S extends Schema.Top>(item: S, identifier: string) =>
  Schema.Struct({
    items: Schema.Array(item),
    page: Schema.Int,
    pageSize: Schema.Int,
    // Rows across every page.
    total: Schema.Int,
  }).annotate({ identifier });

/** Why staff act: written for the audit log, which keeps it. */
export const StaffReasonSchema = Schema.Trim.check(
  Schema.isNonEmpty(),
  Schema.isMaxLength(maxStaffReasonLength)
).annotate({ identifier: "StaffReason" });

/**
 * What staff did, as the audit log records it: an action on an account, a
 * change made while acting as it (`impersonatedChange`), and the end of an
 * impersonation, by staff (`stopImpersonating`) or by the server, as its
 * staff member or the account was banned or signed out everywhere, or the
 * staff member lost the role (`impersonationEnded`); and a legal request a
 * staff member answered (`legalDisclosure`), with the authority and its
 * reference as the reason.
 */
export const StaffActionSchema = Schema.Literals([
  "ban",
  "unban",
  "revokeSessions",
  "resendVerification",
  "impersonate",
  "impersonatedChange",
  "stopImpersonating",
  "impersonationEnded",
  "legalDisclosure",
]).annotate({ identifier: "StaffAction" });

/**
 * The ids a change staff made while acting as an account named, by the
 * name its route gives them (`postId`, `organizationId`).
 */
export const StaffObjectIdsSchema = Schema.Record(
  Schema.String,
  Schema.String
).annotate({ identifier: "StaffObjectIds" });

export type StaffAction = typeof StaffActionSchema.Type;

/** An account in a search's results. */
export const StaffUserSummarySchema = Schema.Struct({
  banned: Schema.Boolean,
  createdAt: Schema.DateTimeUtc,
  email: Schema.String,
  emailVerified: Schema.Boolean,
  id: Schema.String,
  // When its newest session started, while one is left.
  lastSignInAt: Schema.NullOr(Schema.DateTimeUtc),
  name: Schema.String,
  // Whether the account is staff itself.
  staff: Schema.Boolean,
}).annotate({ identifier: "StaffUserSummary" });

export type StaffUserSummary = typeof StaffUserSummarySchema.Type;

export const StaffUserPageSchema = pageOf(
  StaffUserSummarySchema,
  "StaffUserPage"
);

export type StaffUserPage = typeof StaffUserPageSchema.Type;

/** Staff banned the account, for good or until `expiresAt`. */
export const StaffBanSchema = Schema.Struct({
  expiresAt: Schema.NullOr(Schema.DateTimeUtc),
  reason: Schema.NullOr(Schema.String),
}).annotate({ identifier: "StaffBan" });

/** A workspace an account belongs to, with its role there. */
export const StaffMembershipSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  role: Schema.String,
  slug: Schema.String,
}).annotate({ identifier: "StaffMembership" });

/**
 * An account as staff see it: who it is, never what it wrote. Its posts and
 * media are seen only by impersonating it.
 */
export const StaffUserSchema = Schema.Struct({
  // A ban that still holds, if any.
  ban: Schema.NullOr(StaffBanSchema),
  createdAt: Schema.DateTimeUtc,
  email: Schema.String,
  emailVerified: Schema.Boolean,
  id: Schema.String,
  lastSignInAt: Schema.NullOr(Schema.DateTimeUtc),
  locale: Schema.Literals(["en", "fr"]),
  name: Schema.String,
  // The sessions the account signed in itself that have not expired.
  sessions: Schema.Int,
  staff: Schema.Boolean,
  workspaces: Schema.Array(StaffMembershipSchema),
}).annotate({ identifier: "StaffUser" });

export type StaffUser = typeof StaffUserSchema.Type;

/** A workspace in a search's results. */
export const StaffWorkspaceSummarySchema = Schema.Struct({
  createdAt: Schema.DateTimeUtc,
  id: Schema.String,
  members: Schema.Int,
  name: Schema.String,
  slug: Schema.String,
}).annotate({ identifier: "StaffWorkspaceSummary" });

export type StaffWorkspaceSummary = typeof StaffWorkspaceSummarySchema.Type;

export const StaffWorkspacePageSchema = pageOf(
  StaffWorkspaceSummarySchema,
  "StaffWorkspacePage"
);

export type StaffWorkspacePage = typeof StaffWorkspacePageSchema.Type;

/** A member of a workspace, with their role. */
export const StaffMemberSchema = Schema.Struct({
  email: Schema.String,
  name: Schema.String,
  role: Schema.String,
  userId: Schema.String,
}).annotate({ identifier: "StaffMember" });

/** A channel of a workspace and how it is doing, without its tokens. */
export const StaffChannelSchema = Schema.Struct({
  handle: Schema.String,
  id: Schema.String,
  platform: PlatformSchema,
  status: ChannelStatusSchema,
  // When a token that cannot be renewed stops working.
  tokenExpiresAt: Schema.NullOr(Schema.DateTimeUtc),
  workspaceId: Schema.String,
}).annotate({ identifier: "StaffChannel" });

export type StaffChannel = typeof StaffChannelSchema.Type;

/** How many of a workspace's posts are where, drafts included. */
export const StaffPostCountsSchema = Schema.Struct({
  awaitingApproval: Schema.Int,
  cancelled: Schema.Int,
  draft: Schema.Int,
  finished: Schema.Int,
  publishing: Schema.Int,
  scheduled: Schema.Int,
}).annotate({ identifier: "StaffPostCounts" });

export type StaffPostCounts = typeof StaffPostCountsSchema.Type;

/**
 * A post that did not go out on a channel, or may have: ids, the platform,
 * why and when. Never the post's text or media.
 */
export const StaffFailureSchema = Schema.Struct({
  at: Schema.DateTimeUtc,
  channelId: Schema.String,
  // The platform's own code, for support.
  code: Schema.NullOr(Schema.String),
  platform: Schema.NullOr(PlatformSchema),
  postId: Schema.String,
  reason: Schema.Union([FailureReasonSchema, UnconfirmedReasonSchema]),
  status: Schema.Literals(["failed", "unconfirmed"]),
  targetId: Schema.String,
}).annotate({ identifier: "StaffFailure" });

export type StaffFailure = typeof StaffFailureSchema.Type;

/** The plan a workspace is on; no plan on a server that does not bill. */
export const StaffBillingSchema = Schema.Struct({
  plan: Schema.NullOr(PlanSchema),
  subscription: Schema.NullOr(BillingSubscriptionSchema),
}).annotate({ identifier: "StaffBilling" });

/** A workspace as staff see it: its people and health, not its content. */
export const StaffWorkspaceSchema = Schema.Struct({
  billing: StaffBillingSchema,
  channels: Schema.Array(StaffChannelSchema),
  createdAt: Schema.DateTimeUtc,
  failures: Schema.Array(StaffFailureSchema),
  id: Schema.String,
  members: Schema.Array(StaffMemberSchema),
  name: Schema.String,
  posts: StaffPostCountsSchema,
  slug: Schema.String,
}).annotate({ identifier: "StaffWorkspace" });

export type StaffWorkspace = typeof StaffWorkspaceSchema.Type;

/** A scheduled post due soon: when, where and to how many channels. */
export const StaffDuePostSchema = Schema.Struct({
  channels: Schema.Int,
  postId: Schema.String,
  scheduledAt: Schema.DateTimeUtc,
  workspaceId: Schema.String,
}).annotate({ identifier: "StaffDuePost" });

/** The server's health, as the system page shows it. */
export const StaffSystemSchema = Schema.Struct({
  checkedAt: Schema.DateTimeUtc,
  // Scheduled posts due within the hour, the first of them listed.
  due: Schema.Struct({
    posts: Schema.Array(StaffDuePostSchema),
    total: Schema.Int,
  }),
  // Channels to reconnect, now or before their token runs out within a
  // week, the first of them listed.
  failingChannels: Schema.Array(StaffChannelSchema),
  // Scheduled posts whose time passed more than five minutes ago and that
  // have not started: the job runner is behind or stopped.
  overdue: Schema.Int,
  // Whether the database answers.
  ready: Schema.Boolean,
  // The release the server runs (OTEL_SERVICE_VERSION), if it was told.
  release: Schema.NullOr(Schema.String),
}).annotate({ identifier: "StaffSystem" });

export type StaffSystem = typeof StaffSystemSchema.Type;

/**
 * Something staff did, as the audit log keeps it. The account acted on has
 * a null id once it was closed, and so is the reason given about it; the
 * staff member's id stays, as the server answers for what staff did. A
 * change made while acting as the account names the staff member behind
 * it, though what it made carries the account's name.
 */
export const StaffAuditEventSchema = Schema.Struct({
  action: StaffActionSchema,
  at: Schema.DateTimeUtc,
  // How long a ban was to last.
  banExpiresAt: Schema.NullOr(Schema.DateTimeUtc),
  id: Schema.String,
  // The ids a change made while acting as the account named.
  objectIds: StaffObjectIdsSchema,
  // What staff asked for while acting as the account: an endpoint, as
  // `group.endpoint` (`posts.update`), or a route of the sign-in service,
  // as `auth:/path`; or the route that stopped the impersonation.
  operation: Schema.NullOr(Schema.String),
  reason: Schema.NullOr(Schema.String),
  staffEmail: Schema.NullOr(Schema.String),
  staffId: Schema.NullOr(Schema.String),
  targetEmail: Schema.NullOr(Schema.String),
  targetId: Schema.NullOr(Schema.String),
  // The workspace a change made while acting as the account was in.
  workspaceId: Schema.NullOr(Schema.String),
}).annotate({ identifier: "StaffAuditEvent" });

export type StaffAuditEvent = typeof StaffAuditEventSchema.Type;

export const StaffAuditPageSchema = pageOf(
  StaffAuditEventSchema,
  "StaffAuditPage"
);

export type StaffAuditPage = typeof StaffAuditPageSchema.Type;

/** The staff member signed in, for the console's header. */
export const StaffSessionSchema = Schema.Struct({
  email: Schema.String,
  name: Schema.String,
  userId: Schema.String,
}).annotate({ identifier: "StaffSession" });

export type StaffSession = typeof StaffSessionSchema.Type;

/** Why staff act, for the audit log. */
export const StaffReasonPayloadSchema = Schema.Struct({
  reason: StaffReasonSchema,
}).annotate({ identifier: "StaffReasonPayload" });

export type StaffReasonPayload = typeof StaffReasonPayloadSchema.Type;

/** A ban, for good when `expiresAt` is null. */
export const StaffBanPayloadSchema = Schema.Struct({
  expiresAt: Schema.NullOr(Schema.DateTimeUtc),
  reason: StaffReasonSchema,
}).annotate({ identifier: "StaffBanPayload" });

export type StaffBanPayload = typeof StaffBanPayloadSchema.Type;

const userParams = { userId: Schema.String };

const userAction = <const Name extends string, const Path extends `/${string}`>(
  name: Name,
  path: Path,
  summary: string,
  description: string
) =>
  HttpApiEndpoint.post(name, `/users/:userId${path}`, {
    error: [UserNotFound, StaffActionRefused],
    params: userParams,
    payload: StaffReasonPayloadSchema,
    success: HttpApiSchema.NoContent,
  }).annotateMerge(OpenApi.annotations({ description, summary }));

/**
 * The staff console, for the people who run the server: accounts,
 * workspaces, the system's health, and the audit log of what staff did.
 * Every endpoint answers 404 to anyone but staff in their own session. Every
 * action is recorded in the audit log before it is carried out.
 */
export class StaffApi extends HttpApiGroup.make("staff")
  .add(
    HttpApiEndpoint.get("session", "/session", {
      success: StaffSessionSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: "Answers with the staff member who sends the request.",
        summary: "Get the staff member",
      })
    ),
    HttpApiEndpoint.get("users", "/users", {
      query: searchQuery,
      success: StaffUserPageSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: `Lists accounts whose email or name contains \`query\`, or whose id it is, newest first, ${staffPageSize} a page.`,
        summary: "Search accounts",
      })
    ),
    HttpApiEndpoint.get("user", "/users/:userId", {
      error: UserNotFound,
      params: userParams,
      success: StaffUserSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Answers with an account: its profile, whether its address is confirmed, when it was created and last signed in, its ban, its workspaces and roles, and how many sessions it has open.",
        summary: "Get an account",
      })
    ),
    HttpApiEndpoint.post("ban", "/users/:userId/ban", {
      error: [UserNotFound, StaffActionRefused],
      params: userParams,
      payload: StaffBanPayloadSchema,
      success: HttpApiSchema.NoContent,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Bans the account, for good or until `expiresAt`, and signs it out everywhere, sessions it opened as staff to act as someone else included: it can neither sign in nor use its API keys meanwhile. The reason is kept in the audit log and shown to staff.",
        summary: "Ban an account",
      })
    ),
    userAction(
      "unban",
      "/unban",
      "Lift a ban",
      "Lifts the account's ban, if it has one."
    ),
    userAction(
      "revokeSessions",
      "/revoke-sessions",
      "Sign an account out everywhere",
      "Ends every session of the account, those staff opened to act as it included, and those it opened as staff to act as someone else."
    ),
    userAction(
      "resendVerification",
      "/resend-verification",
      "Send the confirmation email again",
      "Emails the account a new link to confirm its address, in its language. Answers 409 when the address is confirmed already."
    ),
    userAction(
      "impersonate",
      "/impersonate",
      "Act as an account",
      "Signs the browser in as the account for an hour, and keeps the staff member's own session to come back to (`POST /api/auth/admin/stop-impersonating`). Staff then cannot change the account or its workspaces, and every change they make is recorded in the audit log under their name. Staff are never impersonated."
    )
  )
  .add(
    HttpApiEndpoint.get("workspaces", "/workspaces", {
      query: searchQuery,
      success: StaffWorkspacePageSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: `Lists workspaces whose name or slug contains \`query\`, or whose id it is, newest first, ${staffPageSize} a page.`,
        summary: "Search workspaces",
      })
    ),
    HttpApiEndpoint.get("workspace", "/workspaces/:workspaceId", {
      error: WorkspaceNotFound,
      params: { workspaceId: Schema.String },
      success: StaffWorkspaceSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Answers with a workspace: its members and roles, its plan and subscription, its channels and their health, how many posts it has in each status, and the latest posts that failed or may have gone out unconfirmed. Never a post's text or media.",
        summary: "Get a workspace",
      })
    ),
    HttpApiEndpoint.get("system", "/system", {
      success: StaffSystemSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Answers with whether the database answers, the release the server runs, the scheduled posts due within the hour, those overdue, and the channels to reconnect.",
        summary: "Get the system's health",
      })
    ),
    HttpApiEndpoint.get("audit", "/audit", {
      query: {
        ...pageQuery,
        // Only what staff did to this account.
        targetId: Schema.optionalKey(Schema.String),
      },
      success: StaffAuditPageSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: `Lists what staff did, newest first, ${staffPageSize} a page: who, what, to which account, why and when, and each change staff made while acting as an account, with the endpoint or route, its workspace and the ids it named, never what it carried.`,
        summary: "Read the audit log",
      })
    )
  )
  .middleware(StaffAccess)
  .prefix("/api/admin") {}
