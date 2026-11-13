import { Duration } from "effect";

// How long the server waits at shutdown, within the 75 seconds Docker gives
// it (stop_grace_period in compose.production.yaml) before it kills it.

/** HTTP requests in flight; past it, Bun closes their connections. */
export const httpShutdownTimeout = Duration.seconds(60);

/** The cluster's calls to the platforms in flight. */
export const workflowShutdownTimeout = Duration.seconds(60);
