import { ChannelSchema, CurrentMember, PermissionSchema } from "acme-contract";
import { Context, Schema } from "effect";
import { Tool, Toolkit } from "effect/ai";

import { ToolRefused } from "#app/mcp/tool-refused.ts";

// The tools only read, within Acme: MCP clients may call them without
// asking, and as often as they like.
const reading = Context.make(Tool.Readonly, true).pipe(
  Context.add(Tool.Destructive, false),
  Context.add(Tool.Idempotent, true),
  Context.add(Tool.OpenWorld, false)
);

const UserSchema = Schema.Struct({
  email: Schema.String,
  id: Schema.String,
  name: Schema.String,
}).annotate({ description: "The signed-in user." });

const ConnectedWorkspaceSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  // What this connection may do there: the user's role, limited to reading
  // when the user agreed to reading only.
  permissions: Schema.Array(PermissionSchema),
  role: Schema.String,
  slug: Schema.String,
}).annotate({
  description: "The workspace this connection acts in, and what it may do.",
});

export const WhoAmI = Tool.make("whoami", {
  dependencies: [CurrentMember],
  description:
    "Tells who this connection acts for: the signed-in user, and the workspace they picked when they connected, with their role and what this connection may do there. Every other tool acts in that workspace only.",
  failure: ToolRefused,
  success: Schema.Struct({
    user: UserSchema,
    workspace: ConnectedWorkspaceSchema,
  }),
})
  .annotateMerge(reading)
  .annotate(Tool.Title, "Who am I");

export const ListWorkspaces = Tool.make("list_workspaces", {
  dependencies: [CurrentMember],
  description:
    "Lists the workspaces the signed-in user belongs to, with their role in each. `connected` marks the one this connection acts in; to work in another, the user connects again and picks it.",
  failure: ToolRefused,
  success: Schema.Struct({
    workspaces: Schema.Array(
      Schema.Struct({
        connected: Schema.Boolean,
        id: Schema.String,
        name: Schema.String,
        role: Schema.String,
        slug: Schema.String,
      })
    ),
  }),
})
  .annotateMerge(reading)
  .annotate(Tool.Title, "List workspaces");

export const ListChannels = Tool.make("list_channels", {
  dependencies: [CurrentMember],
  description:
    "Lists the social accounts (channels) connected to the workspace, oldest first, with whether each one posts or needs to be reconnected. Their tokens are never shown.",
  failure: ToolRefused,
  success: Schema.Struct({ channels: Schema.Array(ChannelSchema) }),
})
  .annotateMerge(reading)
  .annotate(Tool.Title, "List channels");

export const ServerHealth = Tool.make("server_health", {
  description:
    "Tells whether the Acme server is up and can reach its database. When the database is down, other tools fail until it is back.",
  success: Schema.Struct({
    database: Schema.Literals(["up", "down"]),
    server: Schema.Literal("up"),
  }),
})
  .annotateMerge(reading)
  .annotate(Tool.Title, "Server health");

/** Every tool the MCP endpoint offers. */
export const AcmeTools = Toolkit.make(
  WhoAmI,
  ListWorkspaces,
  ListChannels,
  ServerHealth
);
