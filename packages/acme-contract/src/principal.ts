import { Schema } from "effect";

import { PermissionSchema } from "./permission.ts";

/** Whoever a request authenticates as: a signed-in user, or an API key. */
export const PrincipalSchema = Schema.Union([
  Schema.TaggedStruct("user", {
    // Staff acting as this user, when they impersonate them.
    impersonatedBy: Schema.NullOr(Schema.String),
    userId: Schema.String,
  }),
  Schema.TaggedStruct("apiKey", {
    apiKeyId: Schema.String,
    permissions: Schema.Array(PermissionSchema),
    workspaceId: Schema.String,
  }),
]);

export type Principal = typeof PrincipalSchema.Type;

/** Someone acting in one workspace, with what they may do there. */
export const MemberSchema = Schema.Struct({
  permissions: Schema.Array(PermissionSchema),
  principal: PrincipalSchema,
  workspaceId: Schema.String,
});

export type Member = typeof MemberSchema.Type;
