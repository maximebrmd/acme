import { Config, Schema } from "effect";
import { Command, Flag } from "effect/cli";

export const defaultApiUrl = "http://localhost:3000";

// The flag wins, then PEAL_API_URL, then the local development server.
const apiUrl = Flag.String("api-url").pipe(
  Flag.withDescription(
    `Base URL of the Peal API. Defaults to PEAL_API_URL, then ${defaultApiUrl}.`
  ),
  Flag.withMetavar("<url>"),
  Flag.withSchema(Schema.URLFromString),
  Flag.withFallbackConfig(Config.URL("PEAL_API_URL")),
  Flag.withDefault(new URL(defaultApiUrl))
);

/** The flag that lets credentials go over plain HTTP beyond this machine. */
export const insecureHttpFlag = "insecure-http";

/** The variable that does the same, for runs nobody attends. */
export const insecureHttpVariable = "PEAL_INSECURE_HTTP";

// Off unless asked: a key or a token sent over plain HTTP is read by
// anything on the way.
const insecureHttp = Flag.Boolean(insecureHttpFlag).pipe(
  Flag.withDescription(
    `Send the sign-in or the API key over plain HTTP to a server that is not this machine. Without it, the command line sends them over HTTPS, or to localhost, alone. Only for a server on a network you trust, such as a self-hosted one behind no TLS. Defaults to ${insecureHttpVariable}.`
  ),
  Flag.withFallbackConfig(Config.Boolean(insecureHttpVariable)),
  Flag.withDefault(false)
);

// The root command. Its shared flags are accepted before or after a
// subcommand's name; cli.ts turns --api-url into the PealApi client that
// every subcommand uses.
export const peal = Command.make("peal").pipe(
  Command.withSharedFlags({ apiUrl, insecureHttp }),
  Command.withDescription(
    "Work with a Peal server from the terminal. Sign in as yourself with peal login; for a run nobody attends, set PEAL_API_KEY to a workspace API key, which wins over a saved sign-in, and name the workspace by its id (--workspace or PEAL_WORKSPACE). The key is read from the environment alone: there is no flag for it, as a flag lands in the shell's history and in the list of processes. peal doctor checks what a run would use."
  )
);
