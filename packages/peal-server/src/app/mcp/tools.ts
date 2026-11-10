import { Schema } from "effect";
import { Tool, Toolkit } from "effect/ai";
import { ChannelSchema, CurrentMember, PermissionSchema } from "peal-contract";

import { reading } from "#app/mcp/annotations.ts";
import { CapabilityTools } from "#app/mcp/capabilities-tools.ts";
import { PeopleTools } from "#app/mcp/people-tools.ts";
import { PostTools } from "#app/mcp/posts-tools.ts";
import { ReportTools } from "#app/mcp/reports-tools.ts";
import { ReviewTools } from "#app/mcp/review-tools.ts";
import { ToolRefused } from "#app/mcp/tool-refused.ts";

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
    "Lists the social accounts (channels) connected to the workspace, oldest first, with whether each one posts or needs to be reconnected, and for Instagram its `connection`: `instagramLogin` (the professional account itself) or `facebookLogin` (through a Facebook Page), and for LinkedIn `linkedinProfile` (a member's own profile) or `linkedinPage` (a company page, the only LinkedIn channels with post counts and lookups). Their tokens are never shown. Accounts are connected in the web app, where the member signs in on the platform.",
  failure: ToolRefused,
  success: Schema.Struct({ channels: Schema.Array(ChannelSchema) }),
})
  .annotateMerge(reading)
  .annotate(Tool.Title, "List channels");

export const ServerHealth = Tool.make("server_health", {
  description:
    "Tells whether the Peal server is up and can reach its database. When the database is down, other tools fail until it is back.",
  success: Schema.Struct({
    database: Schema.Literals(["up", "down"]),
    server: Schema.Literal("up"),
  }),
})
  .annotateMerge(reading)
  .annotate(Tool.Title, "Server health");

/** Who the connection is, its workspaces and channels, and the server. */
export const BasicTools = Toolkit.make(
  WhoAmI,
  ListWorkspaces,
  ListChannels,
  ServerHealth
);

/**
 * Every tool the MCP endpoint offers. The account's own data (its export,
 * the applications acting for it) is not among them: a tool would hand it
 * all to an AI model. The command line, which saves it in the user's files,
 * reads it instead.
 */
export const PealTools = Toolkit.merge(
  BasicTools,
  PostTools,
  ReportTools,
  PeopleTools,
  CapabilityTools,
  ReviewTools
);
