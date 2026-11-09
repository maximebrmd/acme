import { Context, Effect, FiberSet, Layer, Option, Schema } from "effect";
import type { LogLevel } from "effect";

import { RecordSubscription } from "#billing/application/record-subscription.ts";
import { WorkspaceEntitlements } from "#billing/application/workspace-entitlements.ts";
import { SendAuthEmail } from "#notifications/application/send-auth-email.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { ImpersonationGuard } from "#workspace/application/impersonation-guard.ts";
import { UserPrincipal } from "#workspace/domain/user-principal.ts";

import { AuthStartFailed } from "./auth-start-failed.ts";
import { makeAuthDatabase } from "./database.ts";
import type { ImpersonatedAuthRequest } from "./impersonation.ts";
import { servesMcp } from "./oauth.ts";
import { makeAuth } from "./options.ts";
import type { PealAuth, AuthHooks, AuthLogLevel } from "./options.ts";
import { AuthSettings } from "./settings.ts";

/**
 * The Better Auth instance. Only workspace infrastructure uses it: its
 * routes, and the adapters behind the workspace ports.
 */
export class BetterAuth extends Context.Service<BetterAuth, PealAuth>()(
  "peal-server/workspace/infrastructure/BetterAuth"
) {}

const severities: Readonly<Record<AuthLogLevel, LogLevel.Severity>> = {
  debug: "Debug",
  error: "Error",
  info: "Info",
  warn: "Warn",
};

// Emails still on their way get this long when the server stops.
const drainTimeout = "10 seconds";

const decodeUserId = Schema.decodeUnknownEffect(UserIdSchema);

const decodeWorkspaceId = Schema.decodeUnknownOption(WorkspaceIdSchema);

// A request staff send while acting as someone, through the guard: false
// when it is refused. Better Auth's sessions hold the ids it issued.
const guarded =
  (guard: ImpersonationGuard["Service"]) =>
  ({
    kind,
    objectIds,
    operation,
    staffId,
    userId,
    workspaceId,
  }: ImpersonatedAuthRequest) =>
    Effect.gen(function* impersonatedRequest() {
      const principal = new UserPrincipal({
        impersonatedBy: Option.some(yield* decodeUserId(staffId)),
        userId: yield* decodeUserId(userId),
      });

      const admitted = yield* guard.admit(principal).pipe(
        Effect.as(true),
        Effect.catchTag("NotSignedIn", () => Effect.succeed(false))
      );

      if (!admitted) {
        return false;
      }

      if (kind === "change") {
        yield* guard.changed(principal, {
          objectIds,
          operation,
          workspaceId: decodeWorkspaceId(workspaceId),
        });
      }

      if (kind === "stop") {
        yield* guard.stopped(principal, operation);
      }

      return true;
    }).pipe(Effect.orDie, Effect.withSpan("BetterAuth.impersonatedRequest"));

export const BetterAuthLive = Layer.effect(
  BetterAuth,
  Effect.gen(function* betterAuthLive() {
    const settings = yield* AuthSettings;
    const database = yield* makeAuthDatabase(settings.databasePoolMax);
    const emails = yield* SendAuthEmail;
    const entitlements = yield* WorkspaceEntitlements;
    const subscriptions = yield* RecordSubscription;
    const guard = yield* ImpersonationGuard;

    // Better Auth calls back outside any fiber. Work it starts runs on fibers
    // of this layer, with its logger and tracer, and is waited for, then
    // interrupted, when the layer closes.
    const fibers = yield* FiberSet.make();
    const run = yield* FiberSet.runtime(fibers)();

    // What Better Auth awaits runs with this layer's logger and tracer too.
    const runPromise = Effect.runPromiseWith(yield* Effect.context());

    yield* Effect.addFinalizer(() =>
      FiberSet.awaitEmpty(fibers).pipe(Effect.timeoutOption(drainTimeout))
    );

    const hooks: AuthHooks = {
      // Awaited: the route runs only once the request is admitted and
      // recorded. A database failure refuses it.
      impersonatedRequest: async (request) =>
        await runPromise(guarded(guard)(request)),
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
      // A plan's allowance, read while a member is invited or joins. A
      // database failure refuses the request.
      memberAllowance: async (workspaceId) =>
        await runPromise(
          entitlements
            .of(workspaceId)
            .pipe(Effect.map(({ allowances }) => allowances.members))
        ),
      resetPassword: (link) => {
        run(emails.send({ _tag: "ResetPassword", ...link }));
      },
      // Awaited: the webhook answers an error until the event is recorded,
      // so Stripe sends it again.
      subscriptionChanged: async (event) => {
        await runPromise(subscriptions.record(event).pipe(Effect.asVoid));
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
        "PUBLIC_URL is plain HTTP on another host than this one, so MCP clients cannot sign in and the MCP endpoint refuses every request. Serve Peal over HTTPS to use it."
      );
    }

    return auth;
  })
);
