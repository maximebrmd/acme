import { Context, Layer } from "effect";
import { McpProtocol, McpServer, Tool } from "effect/ai";

import { toolCatalogue } from "#app/mcp/catalogue.ts";
import { PealToolsLive } from "#app/mcp/handlers.ts";
import { MediaTools } from "#app/mcp/media-tools.ts";
import { PostTools } from "#app/mcp/posts-tools.ts";
import { recordedCalls } from "#app/mcp/recorded-calls.ts";
import { ReviewTools } from "#app/mcp/review-tools.ts";
import { PealTools } from "#app/mcp/tools.ts";
import { mcpAuthentication } from "#workspace/container.ts";

// The tools that create, change or delete posts and media, or decide on a
// post's approval: the law has Peal keep the connection of each call a
// year, as it keeps the API's writes to them.
const contentTools: ReadonlySet<string> = new Set(
  [
    ...Object.values(PostTools.tools),
    ...Object.values(MediaTools.tools),
    ...Object.values(ReviewTools.tools),
  ]
    .values()
    .filter((tool) => !Context.get(tool.annotations, Tool.Readonly))
    .map((tool) => tool.name)
);

// Every tool that changes something: each call that ran is kept in the
// workspace's activity log, as the API's writes are.
const changingTools: ReadonlySet<string> = new Set(
  toolCatalogue()
    .filter(({ changes }) => changes)
    .map(({ name }) => name)
);

/** Where the MCP endpoint answers, under PUBLIC_URL. */
export const mcpPath = "/api/mcp";

/** The version the MCP server gives of itself. */
export const mcpServerVersion = "0.1.0";

// The revisions of the protocol the endpoint speaks, newest first.
const protocols = [
  McpProtocol.v2026_07_28,
  McpProtocol.v2025_11_25,
  McpProtocol.v2025_06_18,
] as const;

/** Those revisions, by their dates, as the server card lists them. */
export const mcpProtocolVersions: readonly string[] = protocols.map(
  ({ protocolVersion }) => protocolVersion
);

/**
 * The MCP endpoint, over Streamable HTTP at /api/mcp. Every request needs
 * a credential: an OAuth access token issued for it, which MCP clients
 * obtain by discovering the authorization server from the endpoint's 401
 * (the user signs in on the web app, picks the workspace the client may
 * use, and agrees to what it asks), or, for an agent that runs with nobody
 * to sign in, an API key of a workspace as the bearer token. Tools then act
 * as that member, or with that key's permissions, in that workspace: the
 * same rules as on the API.
 *
 * It speaks the stateless 2026-07-28 revision and, for clients that do not
 * yet, the sessionful 2025-11-25 and 2025-06-18 ones, whose sessions live in
 * this server's memory: Peal runs one server per deployment. Sessions do not
 * expire, so clients may end theirs with DELETE, as those revisions ask them
 * to, rather than leave it in memory until the server restarts; ending one
 * takes its id and a token that works, like any other request. Requests with
 * an Origin header are refused, as no browser page calls it.
 */
export const McpLive = McpServer.layerHttp({
  allowSessionTermination: true,
  instructions:
    "Peal schedules social media posts for teams. These tools act in one workspace: the one the user picked when they connected, or the one the connection's API key belongs to; call whoami to see which, and what this connection may do there. Posting: list_channels answers where a post can go, list_media and import_media what it can show, create_draft saves a post for the user to review, validate_post checks one without making it, and schedule_post, publish_post, create_post and create_posts (several in one call) put posts out, at a time or now. What goes out is public on the platforms and cannot be taken back from Peal: schedule or publish only what the user asked for, on the channels they named, and prefer a draft when unsure. Those tools need the scope workspace:publish, which the user grants when they connect (an API key needs the permission post:schedule); without it, drafts and media still work. A refused post lists every violation at once. After publishing, await_post waits for each channel's result, get_post says how it went, and list_posts finds posts by status, outcome, channel, tag or time; list_tags answers the workspace's tags, which tag_post files a post under and which say nothing to the platforms; ask the user before reposting, confirming or inviting.",
  name: "Peal",
  path: mcpPath,
  protocols: [...protocols],
  registrations: McpServer.toolkit(PealTools).pipe(
    Layer.provide(recordedCalls(changingTools)),
    Layer.provide(PealToolsLive)
  ),
  version: mcpServerVersion,
}).pipe(Layer.provide(mcpAuthentication({ contentTools })));
