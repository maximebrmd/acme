import { Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/http-api";

import { Authentication } from "./authentication.ts";
import { Forbidden } from "./forbidden.ts";
import { PermissionSchema } from "./permission.ts";
import { Unauthenticated } from "./unauthenticated.ts";

/** A workspace the user belongs to, with their role and what it allows. */
export const MembershipSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  permissions: Schema.Array(PermissionSchema),
  role: Schema.String,
  slug: Schema.String,
}).annotate({ identifier: "Membership" });

export type Membership = typeof MembershipSchema.Type;

/** The signed-in user and their workspaces. */
export const MeSchema = Schema.Struct({
  // Staff impersonating the user, if any.
  impersonatedBy: Schema.NullOr(Schema.String),
  user: Schema.Struct({
    email: Schema.String,
    emailVerified: Schema.Boolean,
    id: Schema.String,
    image: Schema.NullOr(Schema.String),
    locale: Schema.Literals(["en", "fr"]),
    name: Schema.String,
  }),
  workspaces: Schema.Array(MembershipSchema),
}).annotate({ identifier: "Me" });

export type Me = typeof MeSchema.Type;

export class SessionApi extends HttpApiGroup.make("session")
  .add(
    HttpApiEndpoint.get("me", "/api/me", {
      error: [Forbidden, Unauthenticated],
      success: MeSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Answers with the signed-in user and every workspace they belong to, with their role and permissions in each. API keys belong to a workspace, not a user, and get 403.",
        summary: "Get the signed-in user",
      })
    )
  )
  .middleware(Authentication) {}
