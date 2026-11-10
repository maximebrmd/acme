import { Context, Layer } from "effect";
import { McpProtocol, McpServer, Tool } from "effect/ai";

import { PealToolsLive } from "#app/mcp/handlers.ts";
import { MediaTools } from "#app/mcp/media-tools.ts";
import { PostTools } from "#app/mcp/posts-tools.ts";
import { PealTools } from "#app/mcp/tools.ts";
import { mcpAuthentication } from "#workspace/container.ts";

// The tools that create, change or delete posts and media: the law has Peal
// keep the connection of each call a year, as it keeps the API's writes to
// them.
const contentTools: ReadonlySet<string> = new Set(
  [...Object.values(PostTools.tools), ...Object.values(MediaTools.tools)]
    .values()
    .filter((tool) => !Context.get(tool.annotations, Tool.Readonly))
    .map((tool) => tool.name)
);

/** Where the MCP endpoint answers, under PUBLIC_URL. */
export const mcpPath = "/api/mcp";

/**
 * The MCP endpoint, over Streamable HTTP at /api/mcp. Every request needs an
 * OAuth access token issued for it, which MCP clients obtain by discovering
 * the authorization server from the endpoint's 401: the user signs in on the
 * web app, picks the workspace the client may use, and agrees to what it
 * asks. Tools then act as that member, in that workspace.
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
    "Peal schedules social media posts for teams. These tools act in the one workspace the user picked when they connected; call whoami to see which, and what this connection may do there. Posting: list_channels answers where a post can go, list_media and import_media what it can show, create_draft saves a post for the user to review, validate_post checks one without making it, and schedule_post, publish_post, create_post and create_posts (several in one call) put posts out, at a time or now. What goes out is public on the platforms and cannot be taken back from Peal: schedule or publish only what the user asked for, on the channels they named, and prefer a draft when unsure. Those tools need the scope workspace:publish, which the user grants when they connect; without it, drafts and media still work. A refused post lists every violation at once. After publishing, await_post waits for each channel's result, get_post says how it went, and list_posts finds posts by status, outcome, channel or time; ask the user before reposting, confirming or inviting.",
  name: "Peal",
  path: mcpPath,
  protocols: [
    McpProtocol.v2026_07_28,
    McpProtocol.v2025_11_25,
    McpProtocol.v2025_06_18,
  ],
  registrations: McpServer.toolkit(PealTools).pipe(
    Layer.provide(PealToolsLive)
  ),
  version: "0.1.0",
}).pipe(Layer.provide(mcpAuthentication(contentTools)));
