import { Command } from "effect/cli";

import { AcmeApi } from "#api.ts";
import { health } from "#commands/health.ts";
import manifest from "#package.json" with { type: "json" };
import { acme } from "#root.ts";

// The command tree. Every subcommand gets the API client for the URL that
// --api-url or ACME_API_URL names; the transport (HttpClient) comes from the
// caller, so main.ts uses fetch and tests use an in-memory server.
export const cli = acme.pipe(
  Command.withSubcommands([health]),
  Command.provide(({ apiUrl }) => AcmeApi.layer(apiUrl))
);

export const { version } = manifest;

// Runs the command line with explicit arguments, without the program name.
export const runWith = Command.runWith(cli, { version });

// Runs the command line with the process arguments.
export const run = Command.run(cli, { version });
