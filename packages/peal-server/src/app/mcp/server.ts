import { Context, Layer } from "effect";
import { McpProtocol, McpServer, Tool } from "effect/ai";

import { PealToolsLive } from "#app/mcp/handlers.ts";
import { PostTools } from "#app/mcp/posts-tools.ts";
import { PealTools } from "#app/mcp/tools.ts";
import { mcpAuthentication } from "#workspace/container.ts";

// The tools that create, change or delete posts: the law has Peal keep the
// connection of each call a year, as it keeps the API's writes to posts.
const contentTools: ReadonlySet<string> = new Set(
  Object.values(PostTools.tools)
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
    "Peal schedules social media posts for teams. These tools act in the one workspace the user picked when they connected; call whoami to see which, and what this connection may do there. Tools that change something (drafts, follow-ups on published posts, invitations) need the user to have let this client do what their role allows, and say what they change: ask the user before reposting, confirming or inviting. Scheduling and publishing are for the user, in the web app.",
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
