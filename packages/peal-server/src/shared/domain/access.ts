import { Option, Schema } from "effect";

import { UserIdSchema, WorkspaceIdSchema } from "./ids.ts";

/**
 * What each resource of a workspace allows. Every context checks these, and
 * the same table configures Better Auth's access control, whose own checks
 * (organization, member, invitation, apiKey) are part of it.
 */
export const statements = {
  analytics: ["read"],
  apiKey: ["create", "read", "update", "delete"],
  assistant: ["use"],
  billing: ["read", "manage"],
  channel: ["read", "connect", "disconnect"],
  invitation: ["create", "cancel"],
  media: ["read", "upload", "delete"],
  member: ["create", "update", "delete"],
  organization: ["update", "delete"],
  post: [
    "read",
    "create",
    "update",
    "delete",
    "schedule",
    "approve",
    "publish",
  ],
  webhook: ["read", "manage"],
} as const;

export type Statements = typeof statements;

export type Resource = keyof Statements;

/** Some actions on some resources, as roles and API keys are granted them. */
export type Grant = {
  readonly [R in Resource]?: readonly Statements[R][number][];
};

/** One action on one resource, written `resource:action`. */
export const PermissionSchema = Schema.Literals([
  "analytics:read",
  "apiKey:create",
  "apiKey:read",
  "apiKey:update",
  "apiKey:delete",
  "assistant:use",
  "billing:read",
  "billing:manage",
  "channel:read",
  "channel:connect",
  "channel:disconnect",
  "invitation:create",
  "invitation:cancel",
  "media:read",
  "media:upload",
  "media:delete",
  "member:create",
  "member:update",
  "member:delete",
  "organization:update",
  "organization:delete",
  "post:read",
  "post:create",
  "post:update",
  "post:delete",
  "post:schedule",
  "post:approve",
  "post:publish",
  "webhook:read",
  "webhook:manage",
]);

export type Permission = typeof PermissionSchema.Type;

const decodePermission = Schema.decodeUnknownOption(PermissionSchema);

/**
 * The permissions a grant lists, in vocabulary order. Actions the vocabulary
 * does not know, as in a grant stored before an action was removed, are
 * dropped rather than trusted.
 */
export const permissionsOf = (
  grant: Readonly<Record<string, readonly string[]>>
): readonly Permission[] => {
  const granted = new Set(
    Object.entries(grant).flatMap(([resource, actions]) =>
      actions.flatMap((action) =>
        Option.toArray(decodePermission(`${resource}:${action}`))
      )
    )
  );

  return PermissionSchema.literals.filter((permission) =>
    granted.has(permission)
  );
};

/** The grant that lists these permissions, grouped by resource. */
export const grantOf = (
  permissions: Iterable<Permission>
): Record<string, string[]> => {
  const grant = new Map<string, string[]>();

  for (const permission of permissions) {
    const [resource = "", action = ""] = permission.split(":");

    grant.set(resource, [...(grant.get(resource) ?? []), action]);
  }

  return Object.fromEntries(grant);
};

/**
 * Who acts: a person, possibly impersonated by staff, or through an OAuth
 * client (`clientId`: the command line, an MCP client), or an API key.
 */
export const ActorSubjectSchema = Schema.Union([
  Schema.TaggedStruct("user", {
    clientId: Schema.optionalKey(Schema.NonEmptyString),
    impersonatedBy: Schema.Option(UserIdSchema),
    userId: UserIdSchema,
  }),
  Schema.TaggedStruct("apiKey", { apiKeyId: Schema.NonEmptyString }),
]);

export type ActorSubject = typeof ActorSubjectSchema.Type;

/**
 * Someone acting in one workspace, with what they may do there. Use cases in
 * every context take an Actor and check it with `can`.
 */
export class Actor extends Schema.Class<Actor>(
  "peal-server/shared/domain/Actor"
)({
  permissions: Schema.Array(PermissionSchema),
  subject: ActorSubjectSchema,
  workspaceId: WorkspaceIdSchema,
}) {}

export const can = (actor: Actor, permission: Permission): boolean =>
  actor.permissions.includes(permission);
