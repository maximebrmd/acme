import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiError,
  HttpApiGroup,
  OpenApi,
} from "effect/http-api";

import { Authentication } from "./authentication.ts";
import { Forbidden } from "./forbidden.ts";
import { WorkspaceAccess } from "./workspace-access.ts";

/** How many days a workspace's activity log keeps an event. */
export const activityRetentionDays = 90;

/** How many events a page holds, unless `limit` says otherwise. */
export const defaultActivityPageSize = 30;

/** The most events a page holds. */
export const maxActivityPageSize = 100;

/**
 * How a request authenticated: a person's session in the web app
 * (`session`), an API key of the workspace (`apiKey`), an OAuth client
 * acting for a member through the API (`oauth`: the command line, another
 * application), through the MCP endpoint (`mcp`), a partner key, in a
 * workspace its partner owns (`partnerKey`), or a connect link, on its
 * hosted page, where nobody signs in (`connectLink`).
 */
export const ActivityViaSchema = Schema.Literals([
  "session",
  "apiKey",
  "oauth",
  "mcp",
  "partnerKey",
  "connectLink",
]).annotate({ identifier: "ActivityVia" });

export type ActivityVia = typeof ActivityViaSchema.Type;

/**
 * Who asked: a member (`user`), or a key (`apiKey`): an API key of the
 * workspace, a key of the partner that owns it (`via` is `partnerKey`), or
 * a connect link, as `connect-link:` followed by its id (`via` is
 * `connectLink`: whoever held the link's address, who is never named). A
 * member whose account was closed since is no longer named: `userId` is
 * null.
 */
export const ActivityActorSchema = Schema.Union([
  Schema.TaggedStruct("user", { userId: Schema.NullOr(Schema.String) }),
  Schema.TaggedStruct("apiKey", { apiKeyId: Schema.String }),
]).annotate({ identifier: "ActivityActor" });

export type ActivityActor = typeof ActivityActorSchema.Type;

/**
 * The API key or the OAuth client a request came through, with the name it
 * had then: null when it had none.
 */
export const ActivityApplicationSchema = Schema.Struct({
  // The key's id, or the client's `client_id`.
  id: Schema.String,
  name: Schema.NullOr(Schema.String),
}).annotate({ identifier: "ActivityApplication" });

export type ActivityApplication = typeof ActivityApplicationSchema.Type;

/**
 * One request that asked to change something in the workspace, as its
 * activity log keeps it. Metadata only: never what the request or its
 * answer carried.
 */
export const ActivityEventSchema = Schema.Struct({
  actor: ActivityActorSchema,
  // The key or the OAuth client it came through; null for a person in the
  // web app, and on an event whose member closed their account since.
  application: Schema.NullOr(ActivityApplicationSchema),
  // The error's `code` when the request was refused or failed; null when
  // it succeeded.
  errorCode: Schema.NullOr(Schema.String),
  id: Schema.String,
  // Staff acting as the member asked.
  impersonated: Schema.Boolean,
  // The ids the request's path named, by name (`postId`, `channelId`).
  objectIds: Schema.Record(Schema.String, Schema.String),
  occurredAt: Schema.DateTimeUtc,
  // The endpoint, as `group.endpoint` (`posts.schedule`), the MCP tool, as
  // `mcp.<tool>` (`mcp.create_draft`), or the sign-in service's route, as
  // `auth:<path>` (`auth:/organization/remove-member`).
  operation: Schema.String,
  // The request's id, as its `X-Request-Id` header gave it.
  requestId: Schema.NullOr(Schema.String),
  // The HTTP status answered; null when there is none, as for an MCP tool
  // call.
  status: Schema.NullOr(Schema.Int),
  via: ActivityViaSchema,
}).annotate({ identifier: "ActivityEvent" });

export type ActivityEvent = typeof ActivityEventSchema.Type;

export const ActivityPageSchema = Schema.Struct({
  items: Schema.Array(ActivityEventSchema),
  // Pass it as `cursor` for the next page; null on the last one.
  nextCursor: Schema.NullOr(Schema.String),
}).annotate({ identifier: "ActivityPage" });

export type ActivityPage = typeof ActivityPageSchema.Type;

/**
 * A workspace's activity log: who changed what, through which application.
 */
export class ActivityApi extends HttpApiGroup.make("activity")
  .add(
    HttpApiEndpoint.get("list", "/", {
      error: [Forbidden, HttpApiError.BadRequest],
      params: { workspaceId: Schema.String },
      query: {
        // A member's user id, or an API key's id.
        actor: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(128))),
        cursor: Schema.optionalKey(Schema.String),
        limit: Schema.optionalKey(
          Schema.Int.check(
            Schema.isBetween({ maximum: maxActivityPageSize, minimum: 1 })
          )
        ),
        operation: Schema.optionalKey(
          Schema.String.check(Schema.isMaxLength(200))
        ),
      },
      success: ActivityPageSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: `Lists the requests that asked to change something in the workspace, newest first, ${defaultActivityPageSize} a page unless \`limit\` (at most ${maxActivityPageSize}) says otherwise: who asked (a member or an API key), how they authenticated, the key or the application it came through, the operation, the ids its path named, the status answered and, when it was refused or failed, the error's code. What the web app's settings change through the sign-in service's routes (roles, members, invitations, the subscription) is kept as \`auth:\` and the route's path. Requests that only read are not kept, and neither is anything a request or its answer carried. \`operation\` keeps one operation (\`posts.schedule\`), \`actor\` what one member (a user id) or one API key (its id) asked for. Pass the page's \`nextCursor\` as \`cursor\` for the next one. An event is kept ${activityRetentionDays} days. Needs activity:read, which owners hold.`,
        summary: "List the workspace's activity",
      })
    )
  )
  .middleware(WorkspaceAccess)
  .middleware(Authentication)
  .prefix("/api/workspaces/:workspaceId/activity") {}
