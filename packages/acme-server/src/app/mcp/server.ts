import { Layer } from "effect";
import { McpProtocol, McpServer } from "effect/ai";

import { AcmeToolsLive } from "#app/mcp/handlers.ts";
import { AcmeTools } from "#app/mcp/tools.ts";
import { McpAuthenticationLive } from "#workspace/container.ts";

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
 * this server's memory: Acme runs one server per deployment. Sessions do not
 * expire, so clients may end theirs with DELETE, as those revisions ask them
 * to, rather than leave it in memory until the server restarts; ending one
 * takes its id and a token that works, like any other request. Requests with
 * an Origin header are refused, as no browser page calls it.
 */
export const McpLive = McpServer.layerHttp({
  allowSessionTermination: true,
  instructions:
    "Acme schedules social media posts for teams. These tools act in the one workspace the user picked when they connected; call whoami to see which, and what this connection may do there.",
  name: "Acme",
  path: mcpPath,
  protocols: [
    McpProtocol.v2026_07_28,
    McpProtocol.v2025_11_25,
    McpProtocol.v2025_06_18,
  ],
  registrations: McpServer.toolkit(AcmeTools).pipe(
    Layer.provide(AcmeToolsLive)
  ),
  version: "0.1.0",
}).pipe(Layer.provide(McpAuthenticationLive));
