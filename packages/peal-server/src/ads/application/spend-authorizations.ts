import { Context, DateTime, Effect, Layer, Option, Schema } from "effect";

import type { AuditAction } from "#ads/domain/audit-action.ts";
import { committedIn, monthsTouched } from "#ads/domain/commitment.ts";
import { AdAccountIdSchema } from "#ads/domain/ids.ts";
import type { Money } from "#ads/domain/money.ts";
import { PersonRequired } from "#ads/domain/person-required.ts";
import type { SpendAuthorization } from "#ads/domain/spend-authorization.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Ids } from "#shared/application/ids.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";

import { AdAccountBusy } from "./ad-account-busy.ts";
import { AdAccountNotFound } from "./ad-account-not-found.ts";
import { audit } from "./audit.ts";
import { CeilingCurrencyMismatch } from "./ceiling-currency-mismatch.ts";
import { AccountStore } from "./ports/account-store.ts";
import type { AuthorizedAccount } from "./ports/account-store.ts";
import { AdNetworks } from "./ports/ad-network.ts";
import { BoostStore } from "./ports/boost-store.ts";
import { SpendingUnavailable } from "./spending-unavailable.ts";

/** What an owner decides of an ad account's spending. */
export type SpendDecision =
  | { readonly _tag: "off" }
  | { readonly _tag: "on"; readonly monthlyCeiling: Money };

/**
 * An ad account's spending as it stands: the owner's decision, and what
 * the boosts made through Peal commit in the current calendar month of the
 * account's zone. Committed may pass the ceiling when the ceiling was
 * lowered under running boosts: nothing new then starts.
 */
export interface SpendStanding {
  readonly account: AuthorizedAccount;
  readonly committedThisMonth: number;
}

// A ceiling under a name, for the audit trail, when spending is on.
const ceilingOf = (
  name: string,
  authorization: SpendAuthorization
): readonly (readonly [string, number])[] =>
  authorization._tag === "on" ? [[name, authorization.monthlyCeiling]] : [];

// What a decision changed, if anything, as the audit trail names it.
const actionOf = (
  before: SpendAuthorization,
  after: SpendAuthorization
): Option.Option<AuditAction> => {
  if (after._tag === "off") {
    return before._tag === "off"
      ? Option.none()
      : Option.some("spendingDisabled");
  }

  if (before._tag === "off") {
    return Option.some("spendingEnabled");
  }

  return before.monthlyCeiling === after.monthlyCeiling
    ? Option.none()
    : Option.some("ceilingChanged");
};

const decodeAccountId = Schema.decodeUnknownOption(AdAccountIdSchema);

/**
 * Whether an ad account may spend through Peal, and how much a month.
 *
 * `decide` is the owner's alone (ads:authorize), in their own session:
 * never a key, an application or staff acting as them. Turning spending
 * on takes an explicit ceiling in the account's currency, on a server
 * whose operator offers spending. A ceiling may always be lowered, under
 * running boosts too: they keep running, and nothing new starts until
 * there is room. Turning spending off is refused while a boost runs or
 * may run: it is stopped first, so "off" never leaves something spending.
 */
export class SpendAuthorizations extends Context.Service<
  SpendAuthorizations,
  {
    readonly standing: (
      actor: Actor,
      accountId: string
    ) => Effect.Effect<
      SpendStanding,
      AdAccountNotFound | DatabaseError | MissingPermission
    >;
    readonly decide: (
      actor: Actor,
      accountId: string,
      decision: SpendDecision
    ) => Effect.Effect<
      SpendStanding,
      | AdAccountBusy
      | AdAccountNotFound
      | CeilingCurrencyMismatch
      | DatabaseError
      | MissingPermission
      | PersonRequired
      | SpendingUnavailable
    >;
  }
>()("peal-server/ads/application/SpendAuthorizations") {
  static readonly layer = Layer.effect(
    SpendAuthorizations,
    Effect.gen(function* SpendAuthorizationsLive() {
      const networks = yield* AdNetworks;
      const accounts = yield* AccountStore;
      const boosts = yield* BoostStore;
      const ports = yield* Effect.context<BoostStore | Ids>();

      const found = Effect.fn("SpendAuthorizations.found")(function* found(
        actor: Actor,
        accountId: string
      ) {
        const id = decodeAccountId(accountId);

        const account = Option.isSome(id)
          ? yield* accounts.findIn(actor.workspaceId, id.value)
          : Option.none<AuthorizedAccount>();

        return Option.isSome(account)
          ? account.value
          : yield* new AdAccountNotFound();
      });

      const standingOf = Effect.fn("SpendAuthorizations.standingOf")(
        function* standingOf(authorized: AuthorizedAccount) {
          const { account } = authorized;
          const now = yield* DateTime.now;

          const runs = yield* boosts.committedOn(
            account.id,
            // Every run that can touch this month: a run lasts 90 days at
            // most.
            {
              from: DateTime.subtract(now, { days: 124 }),
              to: DateTime.add(now, { days: 124 }),
            },
            Option.none()
          );

          const standing: SpendStanding = {
            account: authorized,
            committedThisMonth: committedIn(
              monthsTouched(now, now, account.timeZone),
              runs,
              account.timeZone
            ),
          };

          return standing;
        }
      );

      return SpendAuthorizations.of({
        decide: Effect.fn("SpendAuthorizations.decide")(
          function* decide(actor, accountId, decision) {
            yield* Effect.fromResult(authorize(actor, "ads:authorize"));

            const { subject } = actor;

            if (
              subject._tag !== "user" ||
              subject.clientId !== undefined ||
              Option.isSome(subject.impersonatedBy)
            ) {
              return yield* new PersonRequired();
            }

            const { account } = yield* found(actor, accountId);

            if (decision._tag === "on") {
              if (networks.mode !== "spend") {
                return yield* new SpendingUnavailable();
              }

              if (decision.monthlyCeiling.currency !== account.currency) {
                return yield* new CeilingCurrencyMismatch({
                  accountCurrency: account.currency,
                });
              }
            }

            const now = yield* DateTime.now;

            // Under the account's spending lock: a boost asked meanwhile is
            // counted against the ceiling as it was, or as it now is, never
            // against half a change.
            return yield* accounts.spendingOn(
              account.id,
              Effect.gen(function* deciding() {
                const current = yield* found(actor, accountId);
                const before = current.authorization;

                if (decision._tag === "off") {
                  const open = yield* boosts.openOn([account.id]);

                  if (open > 0) {
                    return yield* new AdAccountBusy({ boosts: open });
                  }
                }

                const after: SpendAuthorization =
                  decision._tag === "on"
                    ? {
                        _tag: "on",
                        at: now,
                        by: Option.some(subject.userId),
                        monthlyCeiling: decision.monthlyCeiling.amount,
                      }
                    : { _tag: "off" };

                yield* accounts.authorize(account.id, after);

                const action = actionOf(before, after);

                if (Option.isSome(action)) {
                  yield* audit({
                    accountId: account.id,
                    action: action.value,
                    amounts: Object.fromEntries([
                      ...ceilingOf("ceiling", after),
                      ...ceilingOf("previousCeiling", before),
                    ]),
                    by: subject,
                    currency: account.currency,
                    workspaceId: account.workspaceId,
                  }).pipe(Effect.provide(ports));
                }

                return yield* standingOf(yield* found(actor, accountId));
              })
            );
          }
        ),
        standing: Effect.fn("SpendAuthorizations.standing")(
          function* standing(actor, accountId) {
            yield* Effect.fromResult(authorize(actor, "ads:read"));

            return yield* standingOf(yield* found(actor, accountId));
          }
        ),
      });
    })
  );
}
