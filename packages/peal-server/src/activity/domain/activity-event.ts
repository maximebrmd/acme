import { Schema } from "effect";

import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";

import { ActivityEventIdSchema } from "./activity-event-id.ts";
import { ObjectIdsSchema } from "./object-ids.ts";

/**
 * What was asked for: an endpoint of the API, as `group.endpoint`
 * (`posts.schedule`), or a tool of the MCP endpoint, as `mcp.<tool>`
 * (`mcp.create_draft`). A name, never a value anyone wrote.
 */
export const ActivityOperationSchema = Schema.String.check(
  Schema.isPattern(/^[\w.:/-]{1,200}$/u)
);

/**
 * Who asked: a member, or a key. A key is an API key of the workspace, a
 * key of the partner that owns it, or a connect link, which stands as a
 * single-purpose key named `connect-link:<its id>`: `via` tells which. A
 * member whose account was closed since is no longer named (`userId`
 * none): the event stays, as the workspace's.
 */
export const ActivityActorSchema = Schema.Union([
  Schema.TaggedStruct("user", { userId: Schema.Option(UserIdSchema) }),
  Schema.TaggedStruct("apiKey", { apiKeyId: Schema.NonEmptyString }),
]);

export type ActivityActor = typeof ActivityActorSchema.Type;

/**
 * How the request authenticated: a person's session in the web app
 * (`session`), an API key (`apiKey`), an OAuth client acting for a member
 * through the API (`oauth`: the command line, another application),
 * through the MCP endpoint (`mcp`), a partner key, in a workspace its
 * partner owns (`partnerKey`), or a connect link, on its hosted page
 * (`connectLink`).
 */
export const ActivityViaSchema = Schema.Literals([
  "session",
  "apiKey",
  "oauth",
  "mcp",
  "partnerKey",
  "connectLink",
]);

export type ActivityVia = typeof ActivityViaSchema.Type;

/**
 * The API key or the OAuth client a request came through, with the name it
 * had then, if it had one: the log still says which one once the key is
 * revoked or the application renamed.
 */
export const ActivityApplicationSchema = Schema.Struct({
  id: Schema.NonEmptyString,
  name: Schema.Option(Schema.String),
});

export type ActivityApplication = typeof ActivityApplicationSchema.Type;

/**
 * One request that asked to change something in a workspace, as its
 * activity log keeps it: who, through what, which operation on which ids,
 * and how it was answered. Metadata only: never what the request or its
 * answer carried, an address or a user agent.
 */
export class ActivityEvent extends Schema.Class<ActivityEvent>(
  "peal-server/activity/domain/ActivityEvent"
)({
  actor: ActivityActorSchema,
  application: Schema.Option(ActivityApplicationSchema),
  /** The error's `code` when the request was refused or failed. */
  errorCode: Schema.Option(Schema.NonEmptyString),
  id: ActivityEventIdSchema,
  /** Staff acting as the member asked; never who. */
  impersonated: Schema.Boolean,
  objectIds: ObjectIdsSchema,
  occurredAt: Schema.DateTimeUtc,
  operation: ActivityOperationSchema,
  requestId: Schema.Option(Schema.NonEmptyString),
  /** The HTTP status answered; none when not known, as for an MCP tool call. */
  status: Schema.Option(Schema.Int),
  via: ActivityViaSchema,
  workspaceId: WorkspaceIdSchema,
}) {}
