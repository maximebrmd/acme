import { Context, Effect, FiberSet, Layer } from "effect";
import type { LogLevel } from "effect";

import { SendAuthEmail } from "#notifications/application/send-auth-email.ts";

import { AuthStartFailed } from "./auth-start-failed.ts";
import { makeAuthDatabase } from "./database.ts";
import { servesMcp } from "./oauth.ts";
import { makeAuth } from "./options.ts";
import type { AcmeAuth, AuthHooks, AuthLogLevel } from "./options.ts";
import { AuthSettings } from "./settings.ts";

/**
 * The Better Auth instance. Only workspace infrastructure uses it: its
 * routes, and the adapters behind the workspace ports.
 */
export class BetterAuth extends Context.Service<BetterAuth, AcmeAuth>()(
  "acme-server/workspace/infrastructure/BetterAuth"
) {}

const severities: Readonly<Record<AuthLogLevel, LogLevel.Severity>> = {
  debug: "Debug",
  error: "Error",
  info: "Info",
  warn: "Warn",
};

// Emails still on their way get this long when the server stops.
const drainTimeout = "10 seconds";

export const BetterAuthLive = Layer.effect(
  BetterAuth,
  Effect.gen(function* betterAuthLive() {
    const settings = yield* AuthSettings;
    const database = yield* makeAuthDatabase(settings.databasePoolMax);
    const emails = yield* SendAuthEmail;

    // Better Auth calls back outside any fiber. Work it starts runs on fibers
    // of this layer, with its logger and tracer, and is waited for, then
    // interrupted, when the layer closes.
    const fibers = yield* FiberSet.make();
    const run = yield* FiberSet.runtime(fibers)();

    yield* Effect.addFinalizer(() =>
      FiberSet.awaitEmpty(fibers).pipe(Effect.timeoutOption(drainTimeout))
    );

    const hooks: AuthHooks = {
      invitation: (link) => {
        run(emails.send({ _tag: "Invitation", ...link }));
      },
      log: (level, message) => {
        run(
          Effect.logWithLevel(severities[level])(message).pipe(
            Effect.annotateLogs("source", "better-auth")
          )
        );
      },
      resetPassword: (link) => {
        run(emails.send({ _tag: "ResetPassword", ...link }));
      },
      verifyEmail: (link) => {
        run(emails.send({ _tag: "VerifyEmail", ...link }));
      },
    };

    const auth = makeAuth({ database, hooks, settings });

    // Checks the secret and options, and fails the server's start if they
    // are wrong, rather than its first request.
    yield* Effect.tryPromise({
      catch: (cause) => new AuthStartFailed({ cause }),
      try: async () => await auth.$context,
    });

    if (!servesMcp(settings.publicUrl)) {
      yield* Effect.logWarning(
        "PUBLIC_URL is plain HTTP on another host than this one, so MCP clients cannot sign in and the MCP endpoint refuses every request. Serve Acme over HTTPS to use it."
      );
    }

    return auth;
  })
);
