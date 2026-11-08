import { Config, Schema } from "effect";
import { Command, Flag } from "effect/cli";

export const defaultApiUrl = "http://localhost:3000";

// The flag wins, then ACME_API_URL, then the local development server.
const apiUrl = Flag.String("api-url").pipe(
  Flag.withDescription(
    `Base URL of the Acme API. Defaults to ACME_API_URL, then ${defaultApiUrl}.`
  ),
  Flag.withMetavar("<url>"),
  Flag.withSchema(Schema.URLFromString),
  Flag.withFallbackConfig(Config.URL("ACME_API_URL")),
  Flag.withDefault(new URL(defaultApiUrl))
);

// The root command. Its shared flags are accepted before or after a
// subcommand's name; cli.ts turns --api-url into the AcmeApi client that
// every subcommand uses.
export const acme = Command.make("acme").pipe(
  Command.withSharedFlags({ apiUrl }),
  Command.withDescription("Work with an Acme server from the terminal.")
);
