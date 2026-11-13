import {
  Context,
  Deferred,
  Duration,
  Effect,
  FiberSet,
  Layer,
  Option,
  Schema,
} from "effect";
import type { LogLevel } from "effect";

import { CheckoutOrders } from "#billing/application/checkout-orders.ts";
import { RecordSubscription } from "#billing/application/record-subscription.ts";
import { WorkspaceEntitlements } from "#billing/application/workspace-entitlements.ts";
import { SendAuthEmail } from "#notifications/application/send-auth-email.ts";
import { UpgradePaths } from "#shared/application/upgrade-paths.ts";
import type { UpgradePath } from "#shared/application/upgrade-paths.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { AccountMail } from "#workspace/application/account-mail.ts";
import type { TwoStepChange } from "#workspace/application/account-mail.ts";
import { ActivityJournal } from "#workspace/application/activity-journal.ts";
import { ImpersonationGuard } from "#workspace/application/impersonation-guard.ts";
import { MemberDirectory } from "#workspace/application/member-directory.ts";
import { SecurityPolicies } from "#workspace/application/security-policies.ts";
import { SignUpGate } from "#workspace/application/sign-up-gate.ts";
import { UserPrincipal } from "#workspace/domain/user-principal.ts";

import { authStarted } from "./auth-start.ts";
import type { CheckoutAnswer, Upgrade } from "./billing.ts";
import { makeAuthDatabase } from "./database.ts";
import type { ImpersonatedAuthRequest } from "./impersonation.ts";
import { servesMcp } from "./oauth.ts";
import { makeAuth } from "./options.ts";
import type { PealAuth, AuthHooks, AuthLogLevel } from "./options.ts";
import { AuthSettings } from "./settings.ts";
import type { WorkspaceAuthChange } from "./workspace-changes.ts";

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

const decodeUser = Schema.decodeUnknownOption(UserIdSchema);

const orderRequired: CheckoutAnswer = {
  _tag: "refused",
  code: "ORDER_REQUIRED",
};

// The way out of a limit, as a refusal tells clients. Only a workspace
// with a plan is refused.
const upgradeOf = (path: UpgradePath): Upgrade => ({
  billingUrl: path.billingUrl,
  plan: Option.getOrElse(path.plan, () => "free" as const),
  planWithRoom: Option.getOrNull(path.planWithRoom),
});

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

// A request to Better Auth's routes that asked to change a workspace, kept
// in the workspace's activity log as the API's writes are. A refusal is
// kept only for someone the workspace knows: anyone can name a workspace
// in a request, and must leave nothing in its log by being refused.
const keptChange =
  (
    activity: ActivityJournal["Service"],
    directory: MemberDirectory["Service"]
  ) =>
  (change: WorkspaceAuthChange) =>
    Effect.gen(function* workspaceChange() {
      const workspaceId = decodeWorkspaceId(change.workspaceId);
      const userId = decodeUser(change.userId);

      if (Option.isNone(workspaceId) || Option.isNone(userId)) {
        return;
      }

      const known =
        change.done ||
        Option.isSome(
          yield* directory.membership(userId.value, workspaceId.value)
        );

      if (!known) {
        return;
      }

      yield* activity.record({
        named: change.objectIds,
        operation: change.operation,
        outcome: { _tag: "answered", status: change.status },
        principal: new UserPrincipal({
          impersonatedBy: Option.fromNullOr(change.impersonatedBy).pipe(
            Option.flatMap(decodeUser)
          ),
          userId: userId.value,
        }),
        requestId: Option.none(),
        via: "session",
        workspaceId: workspaceId.value,
      });
    }).pipe(
      // The route has answered: a log that takes too long, or cannot be
      // kept, is logged, and holds the answer back no longer.
      Effect.timeoutOrElse({
        duration: Duration.seconds(2),
        orElse: () =>
          Effect.logError(
            "Keeping a workspace change in the activity log took too long: it was not kept"
          ),
      }),
      Effect.catchCause((cause) =>
        Effect.logError(
          "Keeping a workspace change in the activity log failed",
          cause
        )
      ),
      Effect.withSpan("BetterAuth.workspaceChange")
    );

// Whether one of these workspaces requires two-step verification while the
// account does not have it on: read from the database, never from a
// session's cached copy of the user.
const lockedOut =
  (
    directory: MemberDirectory["Service"],
    policies: SecurityPolicies["Service"]
  ) =>
  (userId: string, workspaceIds: readonly WorkspaceId[]) =>
    Effect.gen(function* twoStepLockedOut() {
      const required = yield* policies.requiredAmong(workspaceIds);

      if (required.size === 0) {
        return false;
      }

      const account = yield* directory.account(yield* decodeUserId(userId));

      return !Option.exists(account, ({ twoStepEnabled }) => twoStepEnabled);
    }).pipe(Effect.orDie, Effect.withSpan("BetterAuth.twoStepLockedOut"));

// The names of the workspaces the user belongs to that require two-step
// verification.
const requiredBy =
  (
    directory: MemberDirectory["Service"],
    policies: SecurityPolicies["Service"]
  ) =>
  (userId: string) =>
    Effect.gen(function* twoStepRequiredBy() {
      const account = yield* directory.account(yield* decodeUserId(userId));

      if (Option.isNone(account)) {
        return [];
      }

      const { workspaces } = account.value;

      const required = yield* policies.requiredAmong(
        workspaces.map(({ id }) => id)
      );

      return workspaces
        .filter(({ id }) => required.has(id))
        .map(({ name }) => name);
    }).pipe(Effect.orDie, Effect.withSpan("BetterAuth.twoStepRequiredBy"));

// Emails the account what changed in its two-step verification, in its
// language, with how many recovery codes are left once one was used. A
// failure is logged: the change is done.
const toldTwoStep =
  (
    directory: MemberDirectory["Service"],
    mail: AccountMail["Service"],
    instance: Effect.Effect<PealAuth>
  ) =>
  (kind: TwoStepChange, userId: string) =>
    Effect.gen(function* tellTwoStep() {
      const account = yield* directory.account(yield* decodeUserId(userId));

      if (Option.isNone(account)) {
        return;
      }

      const { email, locale } = account.value;

      const recoveryCodesLeft =
        kind === "recoveryCodeUsed"
          ? yield* instance.pipe(
              Effect.flatMap((auth) =>
                Effect.tryPromise(
                  async () =>
                    await auth.api.viewBackupCodes({ body: { userId } })
                )
              ),
              Effect.map(({ backupCodes }) => backupCodes.length)
            )
          : null;

      yield* mail.twoStepChanged({ email, kind, locale, recoveryCodesLeft });
    }).pipe(
      Effect.catchCause((cause) =>
        Effect.logError(
          "Telling an account its two-step verification changed failed",
          cause
        )
      ),
      Effect.withSpan("BetterAuth.twoStepChanged")
    );

export const BetterAuthLive = Layer.effect(
  BetterAuth,
  Effect.gen(function* betterAuthLive() {
    const settings = yield* AuthSettings;
    const database = yield* makeAuthDatabase(settings.databasePoolMax);
    const emails = yield* SendAuthEmail;
    const entitlements = yield* WorkspaceEntitlements;
    const upgrades = yield* UpgradePaths;
    const subscriptions = yield* RecordSubscription;
    const checkouts = yield* CheckoutOrders;
    const guard = yield* ImpersonationGuard;
    const activity = yield* ActivityJournal;
    const directory = yield* MemberDirectory;
    const policies = yield* SecurityPolicies;
    const accountMail = yield* AccountMail;
    const signUps = yield* SignUpGate;

    // The instance, once made: the email of a recovery code used says how
    // many are left, which only the instance reads.
    const made = yield* Deferred.make<PealAuth>();

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
      // Awaited: checkout starts only for an order the member placed. A
      // database failure refuses the request.
      checkout: async (start) =>
        await runPromise(
          checkouts.take(start).pipe(
            Effect.map(({ trialDays }): CheckoutAnswer => ({
              _tag: "start",
              trialDays: Option.getOrNull(trialDays),
            })),
            Effect.catchTags({
              OrderRequired: () => Effect.succeed(orderRequired),
              TrialUnavailable: () =>
                Effect.succeed<CheckoutAnswer>({
                  _tag: "refused",
                  code: "TRIAL_UNAVAILABLE",
                }),
            })
          )
        ),
      // Read while a workspace is created. A database failure refuses it.
      // A workspace in its trial counts as free: it is, once the trial ends.
      freeWorkspace: async (workspaceId) =>
        await runPromise(
          Effect.gen(function* freeWorkspace() {
            const { plan, subscription } = yield* entitlements.of(workspaceId);

            const free =
              Option.exists(plan, (current) => current === "free") ||
              Option.exists(
                subscription,
                ({ status }) => status === "trialing"
              );

            return free ? upgradeOf(yield* upgrades.paid(workspaceId)) : null;
          })
        ),
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
      memberUpgrade: async (workspaceId, needed) =>
        await runPromise(
          upgrades
            .from(workspaceId, "members", needed)
            .pipe(Effect.map(upgradeOf))
        ),
      resetPassword: (link) => {
        run(emails.send({ _tag: "ResetPassword", ...link }));
      },
      // Awaited on each sign-up. A database failure refuses it.
      signUp: async (email, invitationId) =>
        await runPromise(
          signUps.mayRegister(email, Option.fromNullishOr(invitationId))
        ),
      // Awaited: the webhook answers an error until the event is recorded,
      // so Stripe sends it again.
      subscriptionChanged: async (event) => {
        await runPromise(subscriptions.record(event).pipe(Effect.asVoid));
      },
      // Read on each request, from the database: a failure refuses it.
      twoStep: {
        lockedOut: async (userId, workspaceIds) =>
          await runPromise(
            lockedOut(directory, policies)(userId, workspaceIds)
          ),
        requiredBy: async (userId) =>
          await runPromise(requiredBy(directory, policies)(userId)),
      },
      twoStepChanged: ({ kind, userId }) => {
        run(
          toldTwoStep(
            directory,
            accountMail,
            Deferred.await(made)
          )(kind, userId)
        );
      },
      verifyEmail: (link) => {
        run(emails.send({ _tag: "VerifyEmail", ...link }));
      },
      // Awaited, so the log holds the change once its answer is read.
      workspaceChange: async (change) => {
        await runPromise(keptChange(activity, directory)(change));
      },
    };

    const auth = makeAuth({ database, hooks, settings });

    yield* Deferred.succeed(made, auth);

    // Checks the secret, the options and the schema, and fails the server's
    // start if they are wrong, rather than its first request.
    yield* authStarted(auth);

    if (!servesMcp(settings.publicUrl)) {
      yield* Effect.logWarning(
        "PUBLIC_URL is plain HTTP on another host than this one, so MCP clients cannot sign in and the MCP endpoint refuses every request. Serve Peal over HTTPS to use it."
      );
    }

    return auth;
  })
);
