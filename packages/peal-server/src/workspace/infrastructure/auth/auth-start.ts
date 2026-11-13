import { Effect } from "effect";

import { AuthStartFailed } from "#workspace/infrastructure/auth/auth-start-failed.ts";

interface Startable {
  readonly $context: PromiseLike<{
    readonly checkSchema?: (() => PromiseLike<void> | undefined) | undefined;
    readonly explicitSchemaCheck?:
      | (() => PromiseLike<void> | undefined)
      | undefined;
  }>;
}

/**
 * Better Auth, started: its secret and options checked, and the schema it
 * was given checked against the models its options write, which it would
 * otherwise check on the first request. Either failing stops the server's
 * start.
 */
export const authStarted = (auth: Startable) =>
  Effect.tryPromise({
    catch: (cause) => new AuthStartFailed({ cause }),
    try: async () => {
      const context = await auth.$context;

      await (context.explicitSchemaCheck ?? context.checkSchema)?.();
    },
  });
