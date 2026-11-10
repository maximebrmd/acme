import { Console, Duration, Effect, Option } from "effect";
import { Command } from "effect/cli";

import { PealApi } from "#api.ts";
import { display } from "#display.ts";

// Configuring needs no answer from the server, so it does not wait long.
const discoveryTimeout = Duration.seconds(5);

/**
 * The MCP endpoint's identifier, which the server's public URL names: what
 * MCP clients must connect to, whatever URL the command line reaches the
 * server at. A server that does not answer leaves a guess from that URL.
 */
export const mcpEndpoint = Effect.gen(function* mcpEndpoint() {
  const { baseUrl, oauth } = yield* PealApi;

  const discovered = yield* oauth.discovery.mcpResource().pipe(
    Effect.timeout(discoveryTimeout),
    Effect.map(({ resource }) => resource),
    Effect.option
  );

  return {
    discovered: Option.isSome(discovered),
    endpoint: Option.getOrElse(discovered, () =>
      new URL("api/mcp", `${display(baseUrl)}/`).toString()
    ),
  };
});

export const mcp = Command.make(
  "mcp",
  {},
  Effect.fn("mcp")(function* mcp() {
    const { baseUrl, oauth } = yield* PealApi;
    const url = display(baseUrl);
    const { discovered, endpoint } = yield* mcpEndpoint;

    // MCP clients register themselves before they sign in, which the
    // server must allow.
    const registration = yield* oauth.discovery.authorizationServer().pipe(
      Effect.timeout(discoveryTimeout),
      Effect.map(({ registration_endpoint }) =>
        registration_endpoint === undefined ? "closed" : "open"
      ),
      Effect.orElseSucceed(() => "unknown" as const)
    );

    const configuration = JSON.stringify(
      { mcpServers: { peal: { type: "http", url: endpoint } } },
      null,
      2
    );

    yield* Console.log(
      [
        `Peal's MCP server for ${url}:`,
        "",
        `  URL        ${endpoint}`,
        "  Transport  Streamable HTTP",
        "  Sign-in    OAuth: the MCP client opens a browser, where you sign in and pick the workspace it may use.",
        "             Or a workspace API key, sent as the bearer token, for a client nobody attends.",
        "",
        "Most MCP clients take a configuration like this one:",
        "",
        configuration,
      ].join("\n")
    );

    if (!discovered) {
      yield* Console.log(
        `\nThe server did not answer, so this URL is a guess from ${url}. Check it with the server's administrator.`
      );
    }

    if (registration === "closed") {
      yield* Console.log(
        "\nThis server does not let MCP clients register themselves, which most of them need to sign in. Its administrator can allow it with MCP_DYNAMIC_REGISTRATION=true."
      );
    }
  })
).pipe(
  Command.withDescription(
    "Show how to connect an MCP client, such as an AI assistant, to this Peal server."
  )
);
