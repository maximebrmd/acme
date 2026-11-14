// The ports the contract request use cases need, in memory: what billing
// holds, what was asked of Stripe, the emails sent and what staff did, for
// a test to set and read.
import { Context, DateTime, Effect, Layer, Option, Ref } from "effect";

import { BillingMode } from "#billing/application/ports/billing-mode.ts";
import { BillingNotices } from "#billing/application/ports/billing-notices.ts";
import { ContractHolders } from "#billing/application/ports/contract-holders.ts";
import type { ContractHolder } from "#billing/application/ports/contract-holders.ts";
import { ContractReferences } from "#billing/application/ports/contract-references.ts";
import type { NamedContract } from "#billing/application/ports/contract-references.ts";
import { ContractRequests } from "#billing/application/ports/contract-requests.ts";
import { RequestMail } from "#billing/application/ports/request-mail.ts";
import { RequestReview } from "#billing/application/ports/request-review.ts";
import type { HandledRequest } from "#billing/application/ports/request-review.ts";
import { RequestTokens } from "#billing/application/ports/request-tokens.ts";
import { StripeContracts } from "#billing/application/ports/stripe-contracts.ts";
import type { PaidInvoice } from "#billing/application/ports/stripe-contracts.ts";
import { Subscriptions } from "#billing/application/ports/subscriptions.ts";
import { Withdrawals } from "#billing/application/ports/withdrawals.ts";
import type { Withdrawal } from "#billing/application/ports/withdrawals.ts";
import { StripeUnreachable } from "#billing/application/stripe-unreachable.ts";
import type { BillingNotice } from "#billing/domain/billing-notice.ts";
import { changed } from "#billing/domain/contract-request.ts";
import type { ContractRequest } from "#billing/domain/contract-request.ts";
import type { Subscription } from "#billing/domain/subscription.ts";
import { Ids } from "#shared/application/ids.ts";

/** An acknowledgement the mail took, or would not. */
export interface SentAcknowledgement {
  readonly request: ContractRequest;
  readonly token: Option.Option<string>;
}

/** An account, by the address it signs in with. */
export interface HolderByEmail extends ContractHolder {
  readonly email: string;
}

/** What a test sets and reads. */
export class Desk extends Context.Service<
  Desk,
  {
    readonly business: Ref.Ref<boolean>;
    readonly confirmations: Ref.Ref<
      ReadonlyMap<
        string,
        { readonly digest: string; readonly expiresAt: DateTime.Utc }
      >
    >;
    readonly handled: Ref.Ref<readonly HandledRequest[]>;
    readonly held: Ref.Ref<readonly Subscription[]>;
    readonly holders: Ref.Ref<readonly HolderByEmail[]>;
    readonly invoices: Ref.Ref<readonly PaidInvoice[]>;
    readonly mail: Ref.Ref<readonly SentAcknowledgement[]>;
    readonly mailDown: Ref.Ref<boolean>;
    readonly notices: Ref.Ref<readonly BillingNotice[]>;
    readonly references: Ref.Ref<ReadonlyMap<string, NamedContract>>;
    readonly requests: Ref.Ref<ReadonlyMap<string, ContractRequest>>;
    readonly stripe: Ref.Ref<readonly string[]>;
    /** Whether Stripe answers: not at all, or by refusing the request. */
    readonly stripeDown: Ref.Ref<boolean | "refusing">;
    readonly tokens: Ref.Ref<number>;
    readonly withdrawals: Ref.Ref<readonly Withdrawal[]>;
  }
>()("peal-server/test/billing/Desk") {}

const DeskLive = Layer.effect(
  Desk,
  Effect.all({
    business: Ref.make(false),
    confirmations: Ref.make<
      ReadonlyMap<
        string,
        { readonly digest: string; readonly expiresAt: DateTime.Utc }
      >
    >(new Map()),
    handled: Ref.make<readonly HandledRequest[]>([]),
    held: Ref.make<readonly Subscription[]>([]),
    holders: Ref.make<readonly HolderByEmail[]>([]),
    invoices: Ref.make<readonly PaidInvoice[]>([]),
    mail: Ref.make<readonly SentAcknowledgement[]>([]),
    mailDown: Ref.make(false),
    notices: Ref.make<readonly BillingNotice[]>([]),
    references: Ref.make<ReadonlyMap<string, NamedContract>>(new Map()),
    requests: Ref.make<ReadonlyMap<string, ContractRequest>>(new Map()),
    stripe: Ref.make<readonly string[]>([]),
    stripeDown: Ref.make<boolean | "refusing">(false),
    tokens: Ref.make(0),
    withdrawals: Ref.make<readonly Withdrawal[]>([]),
  })
);

const byReceipt = (one: ContractRequest, other: ContractRequest) =>
  DateTime.toEpochMillis(one.receivedAt) -
    DateTime.toEpochMillis(other.receivedAt) || one.id.localeCompare(other.id);

const RequestsInMemory = Layer.effect(
  ContractRequests,
  Desk.use(({ confirmations, requests }) => {
    const all = Ref.get(requests).pipe(
      Effect.map((kept) => [...kept.values()].toSorted(byReceipt))
    );

    return Effect.succeed(
      ContractRequests.of({
        byConfirmation: (digest, now) =>
          Effect.all([all, Ref.get(confirmations)]).pipe(
            Effect.map(([kept, links]) =>
              Option.fromUndefinedOr(
                kept.find((request) => {
                  const link = links.get(request.id);

                  return (
                    link !== undefined &&
                    link.digest === digest &&
                    request.status === "awaitingConfirmation" &&
                    DateTime.isGreaterThan(link.expiresAt, now)
                  );
                })
              )
            )
          ),
        byId: (id) =>
          Ref.get(requests).pipe(
            Effect.map((kept) => Option.fromUndefinedOr(kept.get(id)))
          ),
        claimAcknowledgement: ({ at, email, id, limit, since }) =>
          Ref.modify(requests, (kept) => {
            const sent = [...kept.values()].filter(
              (request) =>
                Option.exists(
                  request.email,
                  (address) => address.toLowerCase() === email.toLowerCase()
                ) &&
                Option.exists(request.acknowledgedAt, (acknowledged) =>
                  DateTime.isGreaterThanOrEqualTo(acknowledged, since)
                )
            ).length;

            const mine = kept.get(id);

            return sent >= limit || mine === undefined
              ? [false, kept]
              : [
                  true,
                  new Map([
                    ...kept,
                    [id, changed(mine, { acknowledgedAt: Option.some(at) })],
                  ]),
                ];
          }),
        eraseWorkspace: () => Effect.void,
        forgetUser: () => Effect.void,
        ofUser: () => Effect.succeed([]),
        open: (limit) =>
          all.pipe(
            Effect.map((kept) =>
              kept
                .filter(
                  ({ status }) =>
                    status === "awaitingConfirmation" || status === "unmatched"
                )
                .slice(0, limit)
            )
          ),
        pending: (before, limit) =>
          all.pipe(
            Effect.map((kept) =>
              kept
                .filter(
                  (request) =>
                    request.acknowledgement === "pending" &&
                    DateTime.isLessThan(request.receivedAt, before)
                )
                .slice(0, limit)
            )
          ),
        purge: () => Effect.succeed(0),
        save: (request) =>
          Ref.update(requests, (kept) =>
            new Map(kept).set(request.id, request)
          ),
        setConfirmation: (id, digest, expiresAt) =>
          Ref.update(confirmations, (links) =>
            new Map(links).set(id, { digest, expiresAt })
          ),
      })
    );
  })
);

const holderOf = ({ userId, workspaces }: HolderByEmail): ContractHolder => ({
  userId,
  workspaces,
});

const PortsInMemory = Layer.mergeAll(
  RequestsInMemory,
  Layer.effect(
    ContractHolders,
    Desk.use(({ holders }) =>
      Effect.succeed(
        ContractHolders.of({
          byEmail: (email) =>
            Ref.get(holders).pipe(
              Effect.map((all) =>
                Option.fromUndefinedOr(
                  all.find(
                    (holder) => holder.email === email.trim().toLowerCase()
                  )
                ).pipe(Option.map(holderOf))
              )
            ),
          byId: (userId) =>
            Ref.get(holders).pipe(
              Effect.map((all) =>
                Option.fromUndefinedOr(
                  all.find((holder) => holder.userId === userId)
                ).pipe(Option.map(holderOf))
              )
            ),
        })
      )
    )
  ),
  Layer.effect(
    ContractReferences,
    Desk.use(({ references }) =>
      Effect.succeed(
        ContractReferences.of({
          eraseWorkspace: () => Effect.void,
          find: (reference) =>
            Ref.get(references).pipe(
              Effect.map((all) => Option.fromUndefinedOr(all.get(reference)))
            ),
          issue: () => Effect.succeed("0000-0000-0000"),
        })
      )
    )
  ),
  // Tokens that count up, each kept as `digest:<token>`.
  Layer.effect(
    RequestTokens,
    Desk.use(({ tokens }) =>
      Effect.succeed(
        RequestTokens.of({
          digestOf: (token) => Effect.succeed(`digest:${token}`),
          issue: Ref.updateAndGet(tokens, (count) => count + 1).pipe(
            Effect.map((count) => ({
              digest: `digest:token-${count}`,
              token: `token-${count}`,
            }))
          ),
        })
      )
    )
  ),
  Layer.effect(
    RequestMail,
    Desk.use(({ mail, mailDown }) =>
      Effect.succeed(
        RequestMail.of({
          acknowledge: (request, token) =>
            Ref.get(mailDown).pipe(
              Effect.flatMap((down) =>
                down
                  ? Effect.succeed(false)
                  : Ref.update(mail, (all) => [
                      ...all,
                      { request, token },
                    ]).pipe(Effect.as(true))
              )
            ),
        })
      )
    )
  ),
  Layer.effect(
    RequestReview,
    Desk.use(({ handled }) =>
      Effect.succeed(
        RequestReview.of({
          handled: (entry) => Ref.update(handled, (all) => [...all, entry]),
        })
      )
    )
  ),
  Layer.effect(
    Subscriptions,
    Desk.use(({ held }) =>
      Effect.succeed(
        Subscriptions.of({
          eraseWorkspace: () => Effect.void,
          forgetUser: () => Effect.void,
          ofWorkspace: (workspaceId) =>
            Ref.get(held).pipe(
              Effect.map((all) =>
                all.filter(
                  (subscription) => subscription.workspaceId === workspaceId
                )
              )
            ),
          ofWorkspaces: () => Effect.die("not read here"),
          markPaidInvoice: () => Effect.void,
          perAccount: () => Effect.succeed([]),
          record: () => Effect.succeed("recorded" as const),
          remindable: () => Ref.get(held),
        })
      )
    )
  ),
  Layer.effect(
    Withdrawals,
    Desk.use(({ withdrawals }) =>
      Effect.succeed(
        Withdrawals.of({
          record: (withdrawal) =>
            Ref.modify(withdrawals, (all) => {
              const before = all.find(
                ({ stripeSubscriptionId }) =>
                  stripeSubscriptionId === withdrawal.stripeSubscriptionId
              );

              return before === undefined
                ? [withdrawal, [...all, withdrawal]]
                : [before, all];
            }),
        })
      )
    )
  ),
  Layer.effect(
    StripeContracts,
    Desk.use(({ business, invoices, stripe, stripeDown }) => {
      // Stripe answers, unless the test took it down.
      const asked = (workspaceId: Subscription["workspaceId"], call: string) =>
        Ref.get(stripeDown).pipe(
          Effect.flatMap((down) =>
            down === false
              ? Ref.update(stripe, (all) => [...all, call])
              : Effect.fail(
                  new StripeUnreachable({
                    permanent: down === "refusing",
                    workspaceId,
                  })
                )
          )
        );

      return Effect.succeed(
        StripeContracts.of({
          cancelAt: (workspace, id, on) =>
            asked(workspace, `cancelAt ${id} ${DateTime.formatIso(on)}`),
          cancelAtPeriodEnd: (workspace, id) =>
            asked(workspace, `cancelAtPeriodEnd ${id}`),
          credit: (workspace, id, credits) =>
            asked(
              workspace,
              `credit ${id} ${credits.map(({ amount, invoiceId }) => `${invoiceId}:${amount}`).join(" ")}`
            ).pipe(Effect.as([])),
          endAtTrialEnd: () => Effect.void,
          endAndInvoice: (workspace, id, reason) =>
            asked(workspace, `endAndInvoice ${id} ${reason}`),
          endNow: (workspace, id, reason) =>
            asked(workspace, `endNow ${id} ${reason}`),
          isBusiness: () => Ref.get(business),
          paidInvoices: () => Ref.get(invoices),
          upcomingTotal: () => Effect.succeedNone,
        })
      );
    })
  ),
  Layer.effect(
    BillingNotices,
    Desk.use(({ notices }) =>
      Effect.succeed(
        BillingNotices.of({
          tell: ({ notice }) => Ref.update(notices, (all) => [...all, notice]),
        })
      )
    )
  )
);

/**
 * The ports in memory, with deterministic ids, on a server that bills
 * unless `enabled` says otherwise.
 */
export const deskPorts = (enabled = true) =>
  PortsInMemory.pipe(
    Layer.provideMerge(DeskLive),
    Layer.provideMerge(Ids.layerTest),
    Layer.provideMerge(
      Layer.succeed(
        BillingMode,
        BillingMode.of({
          enabled,
          graceSince: Option.none(),
          graceUntil: Option.none(),
        })
      )
    )
  );
