import { Console, Duration, Effect, Option } from "effect";
import { Command } from "effect/cli";

import { AcmeApi } from "#api.ts";
import { display } from "#display.ts";

// Configuring needs no answer from the server, so it does not wait long.
const discoveryTimeout = Duration.seconds(5);

export const mcp = Command.make(
  "mcp",
  {},
  Effect.fn("mcp")(function* mcp() {
    const { baseUrl, oauth } = yield* AcmeApi;
    const url = display(baseUrl);

    // The endpoint's identifier, which its public URL names: what MCP
    // clients must connect to, whatever URL the command line reaches the
    // server at.
    const discovered = yield* oauth.discovery.mcpResource().pipe(
      Effect.timeout(discoveryTimeout),
      Effect.map(({ resource }) => resource),
      Effect.option
    );

    const endpoint = Option.getOrElse(discovered, () =>
      new URL("api/mcp", `${url}/`).toString()
    );

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
      { mcpServers: { acme: { type: "http", url: endpoint } } },
      null,
      2
    );

    yield* Console.log(
      [
        `Acme's MCP server for ${url}:`,
        "",
        `  URL        ${endpoint}`,
        "  Transport  Streamable HTTP",
        "  Sign-in    OAuth: the MCP client opens a browser, where you sign in and pick the workspace it may use.",
        "",
        "Most MCP clients take a configuration like this one:",
        "",
        configuration,
      ].join("\n")
    );

    if (Option.isNone(discovered)) {
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
    "Show how to connect an MCP client, such as an AI assistant, to this Acme server."
  )
);
