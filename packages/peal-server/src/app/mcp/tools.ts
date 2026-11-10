import { Schema } from "effect";
import { Tool, Toolkit } from "effect/ai";
import {
  ChannelPageSchema,
  ChannelSchema,
  ChannelStatusNameSchema,
  ChannelUpdateSchema,
  CurrentMember,
  maxChannelLabelLength,
  maxChannelQueryLength,
  PermissionSchema,
  PlatformSchema,
} from "peal-contract";

import { changing, reading } from "#app/mcp/annotations.ts";
import { CapabilityTools } from "#app/mcp/capabilities-tools.ts";
import { ConnectTools } from "#app/mcp/connect-tools.ts";
import { FindTools } from "#app/mcp/discovery-tools.ts";
import { MediaTools } from "#app/mcp/media-tools.ts";
import { PeopleTools } from "#app/mcp/people-tools.ts";
import { PostTools } from "#app/mcp/posts-tools.ts";
import { ReportTools } from "#app/mcp/reports-tools.ts";
import { ReviewTools } from "#app/mcp/review-tools.ts";
import { SavedTools } from "#app/mcp/saved-tools.ts";
import { TagTools } from "#app/mcp/tags-tools.ts";
import { ToolRefused } from "#app/mcp/tool-refused.ts";
import { WebhookTools } from "#app/mcp/webhooks-tools.ts";

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
  // The member's role; null for an API key, which has permissions only.
  role: Schema.NullOr(Schema.String),
  slug: Schema.String,
}).annotate({
  description: "The workspace this connection acts in, and what it may do.",
});

const ApiKeySchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
}).annotate({
  description:
    "The API key this connection sends, by the name its creator gave it. Never the key itself.",
});

export const WhoAmI = Tool.make("whoami", {
  dependencies: [CurrentMember],
  description:
    "Tells who this connection acts for, and what it may do. Connected with OAuth: `user` is the signed-in member and `workspace` the one they picked when they connected, with their role; `apiKey` is null. Connected with an API key: `apiKey` names the key, `user` and the role are null (a key is nobody), and `workspace` is the key's. `permissions` lists what this connection may do there: check it before calling a tool that changes something. Every other tool acts in that workspace only.",
  failure: ToolRefused,
  success: Schema.Struct({
    apiKey: Schema.NullOr(ApiKeySchema),
    user: Schema.NullOr(UserSchema),
    workspace: ConnectedWorkspaceSchema,
  }),
})
  .annotateMerge(reading)
  .annotate(Tool.Title, "Who am I");

export const ListWorkspaces = Tool.make("list_workspaces", {
  dependencies: [CurrentMember],
  description:
    "Lists the workspaces the signed-in user belongs to, with their role in each. `connected` marks the one this connection acts in; to work in another, the user connects again and picks it. An API key lists its own workspace alone, with a null role.",
  failure: ToolRefused,
  success: Schema.Struct({
    workspaces: Schema.Array(
      Schema.Struct({
        connected: Schema.Boolean,
        id: Schema.String,
        name: Schema.String,
        role: Schema.NullOr(Schema.String),
        slug: Schema.String,
      })
    ),
  }),
})
  .annotateMerge(reading)
  .annotate(Tool.Title, "List workspaces");

const channelId = Schema.String.annotate({
  description: "The channel's id, as list_channels answers it.",
});

const StatusCountsSchema = ChannelPageSchema.fields.counts.annotate({
  description:
    "How many channels the platform and text asked for match in each status, whatever the status asked for.",
});

export const ListChannels = Tool.make("list_channels", {
  dependencies: [CurrentMember],
  description:
    "Lists the social accounts (channels) connected to the workspace, oldest first, each with whether it posts, is turned off or needs to be reconnected, and the name the workspace gave it. `status` is `active` (it posts), `disabled` (turned off: nothing goes out on it until enable_channel turns it back on) or `refreshNeeded` (the user reconnects the account in the web app). `label` is the name the workspace gave the channel, null when it gave none: a name of Peal's own, beside the `handle` and `displayName` its platform gives the account. Instagram channels have a `connection`: `instagramLogin` (the professional account itself) or `facebookLogin` (through a Facebook Page), and LinkedIn ones `linkedinProfile` (a member's own profile) or `linkedinPage` (a company page, the only LinkedIn channels with post counts and lookups). `platform`, `status` and `search` narrow the list, every one given holding, and the answer then has `counts` too: how many channels the platform and text match in each status. Their tokens are never shown. Accounts are connected in the web app, where the member signs in on the platform.",
  failure: ToolRefused,
  parameters: Schema.Struct({
    platform: Schema.optionalKey(
      PlatformSchema.annotate({
        description: "Only the channels of this platform.",
      })
    ),
    search: Schema.optionalKey(
      Schema.String.check(
        Schema.isBetweenLength(1, maxChannelQueryLength)
      ).annotate({
        description:
          "Only the channels whose handle, the name their platform shows or the name the workspace gave them holds this text, whatever its case.",
      })
    ),
    status: Schema.optionalKey(
      ChannelStatusNameSchema.annotate({
        description:
          "Only the channels that post (`active`), are turned off (`disabled`) or need to be reconnected (`refreshNeeded`).",
      })
    ),
  }),
  success: Schema.Struct({
    channels: Schema.Array(ChannelSchema),
    counts: Schema.optionalKey(StatusCountsSchema),
  }),
})
  .annotateMerge(reading)
  .annotate(Tool.Title, "List channels");

export const RenameChannel = Tool.make("rename_channel", {
  dependencies: [CurrentMember],
  description: `Gives a channel of the workspace the name the workspace calls it by (\`label\`), instead of any it had, for every member, or takes it back with null. The name is Peal's own: it is shown beside the handle and name the platform gives the account, which stay, and is sent to no platform. The same name again changes nothing more.`,
  failure: ToolRefused,
  parameters: Schema.Struct({
    channelId,
    label: ChannelUpdateSchema.fields.label.annotate({
      description: `The name: ${String(maxChannelLabelLength)} characters at most, on one line, without spaces around it. Null takes the channel's name back.`,
    }),
  }),
  success: ChannelSchema,
})
  .annotateMerge(
    changing({ destructive: true, idempotent: true, openWorld: false })
  )
  .annotate(Tool.Title, "Rename a channel");

export const DisableChannel = Tool.make("disable_channel", {
  dependencies: [CurrentMember],
  description:
    "Turns a channel of the workspace off, for every member: nothing goes out on it until enable_channel turns it back on. A post that reaches its time while the channel is off fails on that channel (`channelDisabled`), goes out on its other channels, and is not sent later: scheduled posts for this channel will fail there, so do it only when the user asked for this channel to be turned off. Nothing is deleted: the channel keeps its connection, its history, its name and its place in the plan's count. A channel already off stays as it is.",
  failure: ToolRefused,
  parameters: Schema.Struct({ channelId }),
  success: ChannelSchema,
})
  .annotateMerge(
    changing({ destructive: false, idempotent: true, openWorld: false })
  )
  .annotate(Tool.Title, "Turn a channel off");

export const EnableChannel = Tool.make("enable_channel", {
  dependencies: [CurrentMember],
  description:
    "Turns a channel of the workspace back on, for every member: posts go out on it again at once, the scheduled ones at their time. Its status is `refreshNeeded` instead when its platform stopped accepting its token while it was off: the user then reconnects the account in the web app. The posts that failed on it while it was off are not sent: they are scheduled anew. A channel that is on stays as it is.",
  failure: ToolRefused,
  parameters: Schema.Struct({ channelId }),
  success: ChannelSchema,
})
  .annotateMerge(
    changing({ destructive: false, idempotent: true, openWorld: false })
  )
  .annotate(Tool.Title, "Turn a channel back on");

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

/**
 * Who the connection is, its workspaces and channels, with the name each
 * channel has and whether it is on, the server, and the list of the tools
 * themselves.
 */
export const BasicTools = Toolkit.make(
  FindTools,
  WhoAmI,
  ListWorkspaces,
  ListChannels,
  RenameChannel,
  DisableChannel,
  EnableChannel,
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
  TagTools,
  SavedTools,
  MediaTools,
  ReportTools,
  PeopleTools,
  CapabilityTools,
  ReviewTools,
  WebhookTools,
  ConnectTools
);
