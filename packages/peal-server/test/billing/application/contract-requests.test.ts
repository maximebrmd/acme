// The cancel and withdraw functions anyone reaches without signing in, on
// ports in memory: what ties a request to a contract, what a stranger can
// and cannot do with someone's address, and what staff do with the rest.
import { assert, layer } from "@effect/vitest";
import { DateTime, Duration, Effect, Layer, Option, Ref } from "effect";
import { TestClock } from "effect/testing";

import { CancelSubscription } from "#billing/application/cancel-subscription.ts";
import { ConfirmContractRequest } from "#billing/application/confirm-contract-request.ts";
import { ContractRequestDesk } from "#billing/application/contract-request-desk.ts";
import { ReceiveContractRequest } from "#billing/application/receive-contract-request.ts";
import type { RequestForm } from "#billing/application/receive-contract-request.ts";
import { SettleContractRequest } from "#billing/application/settle-contract-request.ts";
import { Withdraw } from "#billing/application/withdraw.ts";
import type { ContractRequestId } from "#billing/domain/contract-request.ts";
import type { Subscription } from "#billing/domain/subscription.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { Desk, deskPorts } from "#test/billing/fakes/contract-desk.ts";
import { subscriptionOf } from "#test/billing/support.ts";

const workspaceId = WorkspaceIdSchema.make(
  "3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f"
);

const otherWorkspace = WorkspaceIdSchema.make(
  "4d5e6f7a-8b9c-4d0e-9f1a-2b3c4d5e6f7a"
);

const holderId = UserIdSchema.make("5e6f7a8b-9c0d-4e1f-8a2b-3c4d5e6f7a8c");

const staffId = UserIdSchema.make("6f7a8b9c-0d1e-4f2a-9b3c-4d5e6f7a8b9d");

const holderEmail = "holder@example.test";

const reference = "7K3M-9QXD-42TN";

const at = (iso: string) => DateTime.makeUnsafe(iso);

const UseCases = Layer.mergeAll(
  ReceiveContractRequest.layer,
  ConfirmContractRequest.layer,
  ContractRequestDesk.layer
).pipe(
  Layer.provideMerge(SettleContractRequest.layer),
  Layer.provideMerge(Layer.mergeAll(CancelSubscription.layer, Withdraw.layer))
);

const RequestsTest = UseCases.pipe(Layer.provideMerge(deskPorts()));

const paid = (fields: Partial<Subscription> = {}) =>
  subscriptionOf({
    currentPeriodEnd: Option.some(at("2026-12-01T00:00:00Z")),
    currentPeriodStart: Option.some(at("2026-11-01T00:00:00Z")),
    plan: "starter",
    startedAt: Option.some(at("2026-11-01T00:00:00Z")),
    status: "active",
    stripeSubscriptionId: "sub_synthetic_paid",
    workspaceId,
    ...fields,
  });

// A studio whose owner manages its billing, subscribed, with a contract
// number; nothing asked, sent or recorded yet.
const studio = (now: string, ...held: readonly Subscription[]) =>
  Desk.use((desk) =>
    Effect.all([
      Ref.set(desk.business, false),
      Ref.set(desk.confirmations, new Map()),
      Ref.set(desk.handled, []),
      Ref.set(desk.held, held.length === 0 ? [paid()] : held),
      Ref.set(desk.holders, [
        {
          email: holderEmail,
          userId: holderId,
          workspaces: [{ id: workspaceId, name: "Synthetic Studio" }],
        },
      ]),
      Ref.set(desk.invoices, [
        {
          invoiceId: "in_synthetic",
          paid: { amount: 900, currency: "eur" },
          periodEnd: Option.none(),
          periodStart: Option.none(),
        },
      ]),
      Ref.set(desk.mail, []),
      Ref.set(desk.mailDown, false),
      Ref.set(desk.notices, []),
      Ref.set(
        desk.references,
        new Map([
          [
            reference,
            { stripeSubscriptionId: "sub_synthetic_paid", workspaceId },
          ],
        ])
      ),
      Ref.set(desk.requests, new Map()),
      Ref.set(desk.stripe, []),
      Ref.set(desk.stripeDown, false),
      Ref.set(desk.withdrawals, []),
    ])
  ).pipe(Effect.andThen(TestClock.setTime(at(now).epochMilliseconds)));

const form = (fields: Partial<RequestForm> = {}): RequestForm => ({
  contract: Option.none(),
  desiredAt: Option.none(),
  email: holderEmail,
  kind: "cancellation",
  locale: "fr",
  name: "Camille Synthetic",
  ...fields,
});

// Receives a form's request and looks at it, as the API does.
const send = Effect.fn("send")(function* send(fields: Partial<RequestForm>) {
  const function_ = yield* ReceiveContractRequest;
  const { id } = yield* function_.receive(form(fields));

  // The API runs it apart, and logs what Stripe would not take.
  yield* function_
    .process(id)
    .pipe(Effect.catchTag("StripeUnreachable", () => Effect.void));

  return id;
});

const kept = (id: ContractRequestId) =>
  Desk.use(({ requests }) => Ref.get(requests)).pipe(
    Effect.map((all) => all.get(id)),
    Effect.flatMap((request) =>
      request === undefined
        ? Effect.die(new Error("The request was not kept"))
        : Effect.succeed(request)
    )
  );

const askedOfStripe = Desk.use(({ stripe }) => Ref.get(stripe));

const mailed = Desk.use(({ mail }) => Ref.get(mail));

layer(RequestsTest)("requests to cancel or withdraw, from the form", (it) => {
  it.effect(
    "applies at once a request that gives the contract's number, whatever its address",
    () =>
      Effect.gen(function* byNumber() {
        yield* studio("2026-11-10T08:00:00Z");

        const function_ = yield* ReceiveContractRequest;

        // Typed as people type: lowercase, spaces for dashes.
        const answered = yield* function_.receive(
          form({
            contract: Option.some(" 7k3m 9qxd 42tn "),
            email: "elsewhere@example.test",
          })
        );

        // The answer tells when it came, and nothing of what it found.
        assert.deepStrictEqual(Object.keys(answered).toSorted(), [
          "id",
          "receivedAt",
        ]);
        assert.deepStrictEqual(answered.receivedAt, at("2026-11-10T08:00:00Z"));

        yield* function_.process(answered.id);

        const request = yield* kept(answered.id);

        assert.strictEqual(request.status, "applied");
        assert.deepStrictEqual(
          request.effectiveAt,
          Option.some(at("2026-12-01T00:00:00Z"))
        );
        assert.deepStrictEqual(request.workspaceId, Option.some(workspaceId));
        assert.deepStrictEqual(yield* askedOfStripe, [
          "cancelAtPeriodEnd sub_synthetic_paid",
        ]);

        // Acknowledged to the address given, with what became of it, and
        // the members who manage billing are told as for any cancellation.
        const [acknowledged] = yield* mailed;

        assert.strictEqual(acknowledged?.request.status, "applied");
        assert.deepStrictEqual(
          acknowledged?.request.email,
          Option.some("elsewhere@example.test")
        );
        assert.isTrue(Option.isNone(acknowledged?.token ?? Option.some("")));
        assert.strictEqual(request.acknowledgement, "sent");
        assert.deepStrictEqual(
          (yield* Desk.use(({ notices }) => Ref.get(notices))).map(
            ({ _tag }) => _tag
          ),
          ["SubscriptionCancelled"]
        );
      })
  );

  it.effect(
    "ends nothing for a stranger who knows only the holder's address",
    () =>
      Effect.gen(function* stranger() {
        yield* studio("2026-11-10T08:00:00Z");

        for (const contract of [
          Option.none<string>(),
          // The workspace's name, which anyone may know.
          Option.some("Synthetic Studio"),
          // A number that is nobody's.
          Option.some("0000-0000-0000"),
        ]) {
          const id = yield* send({ contract });

          assert.strictEqual((yield* kept(id)).status, "awaitingConfirmation");
        }

        assert.deepStrictEqual(yield* askedOfStripe, []);
        assert.isEmpty(yield* Desk.use(({ notices }) => Ref.get(notices)));

        // The holder hears of each, at their own address, with the link
        // that would apply it.
        const sent = yield* mailed;

        assert.lengthOf(sent, 3);
        assert.isTrue(sent.every(({ token }) => Option.isSome(token)));
        assert.isTrue(
          sent.every(({ request }) =>
            Option.contains(request.email, holderEmail)
          )
        );
      })
  );

  it.effect(
    "applies the request once the link sent to the address is followed, as of the day it came",
    () =>
      Effect.gen(function* byLink() {
        yield* studio("2026-11-30T22:00:00Z");

        const id = yield* send({});
        const [sent] = yield* mailed;
        const token = Option.getOrThrow(sent?.token ?? Option.none());

        // Followed two days later: the plan renewed on 1 December.
        yield* TestClock.setTime(at("2026-12-02T09:00:00Z").epochMilliseconds);
        yield* Desk.use((desk) =>
          Effect.all([
            Ref.set(desk.held, [
              paid({
                currentPeriodEnd: Option.some(at("2027-01-01T00:00:00Z")),
                currentPeriodStart: Option.some(at("2026-12-01T00:00:00Z")),
              }),
            ]),
            Ref.set(desk.invoices, [
              {
                invoiceId: "in_december",
                paid: { amount: 900, currency: "eur" },
                periodEnd: Option.some(at("2027-01-01T00:00:00Z")),
                periodStart: Option.some(at("2026-12-01T00:00:00Z")),
              },
            ]),
          ])
        );

        const confirmations = yield* ConfirmContractRequest;
        const preview = yield* confirmations.preview(token);

        assert.strictEqual(preview.request.id, id);
        assert.deepStrictEqual(
          preview.contracts.map((contract) => ({
            plan: contract.plan,
            workspaceId: contract.workspaceId,
            workspaceName: contract.workspaceName,
          })),
          [{ plan: "starter", workspaceId, workspaceName: "Synthetic Studio" }]
        );

        const applied = yield* confirmations.confirm(token, workspaceId);

        assert.strictEqual(applied.status, "applied");
        assert.deepStrictEqual(
          applied.refunded,
          Option.some({ amount: 900, currency: "eur" })
        );
        // The renewal charged after the request came goes back.
        assert.deepStrictEqual(yield* askedOfStripe, [
          "credit sub_synthetic_paid in_december:900",
          "endNow sub_synthetic_paid cancelledLate",
        ]);

        // A link works once.
        const again = yield* confirmations.preview(token).pipe(Effect.flip);

        assert.strictEqual(again._tag, "ContractRequestNotFound");
      })
  );

  it.effect(
    "opens nothing with a wrong link, an expired one, or for a workspace the address does not manage",
    () =>
      Effect.gen(function* links() {
        yield* studio("2026-11-10T08:00:00Z");
        yield* send({});

        const [sent] = yield* mailed;
        const token = Option.getOrThrow(sent?.token ?? Option.none());
        const confirmations = yield* ConfirmContractRequest;

        const wrong = yield* confirmations
          .preview("token-of-nobody")
          .pipe(Effect.flip);

        assert.strictEqual(wrong._tag, "ContractRequestNotFound");

        const elsewhere = yield* confirmations
          .confirm(token, otherWorkspace)
          .pipe(Effect.flip);

        assert.strictEqual(elsewhere._tag, "ContractRequestNotFound");
        assert.deepStrictEqual(yield* askedOfStripe, []);

        yield* TestClock.adjust(Duration.days(30));

        const expired = yield* confirmations.preview(token).pipe(Effect.flip);

        assert.strictEqual(expired._tag, "ContractRequestNotFound");
      })
  );

  it.effect(
    "counts a withdrawal's 14 days from when the statement came, and says why one is refused",
    () =>
      Effect.gen(function* withdrawals() {
        // The contract started on 1 November: received on the 14th, its
        // link followed on the 17th.
        yield* studio("2026-11-14T00:00:00Z");

        yield* send({ kind: "withdrawal" });

        const [sent] = yield* mailed;
        const token = Option.getOrThrow(sent?.token ?? Option.none());

        yield* TestClock.setTime(at("2026-11-17T00:00:00Z").epochMilliseconds);

        const applied = yield* (yield* ConfirmContractRequest).confirm(
          token,
          workspaceId
        );

        assert.strictEqual(applied.status, "applied");
        assert.deepStrictEqual(
          applied.effectiveAt,
          Option.some(at("2026-11-14T00:00:00Z"))
        );
        assert.deepStrictEqual(
          applied.refunded,
          Option.some({ amount: 510, currency: "eur" })
        );

        // With the contract's number, on the 15th day: too late, and told.
        yield* studio("2026-11-15T00:00:00Z");

        const late = yield* send({
          contract: Option.some(reference),
          kind: "withdrawal",
        });

        const refused = yield* kept(late);

        assert.strictEqual(refused.status, "refused");
        assert.deepStrictEqual(refused.refusal, Option.some("expired"));
        assert.deepStrictEqual(yield* askedOfStripe, []);
        assert.deepStrictEqual(
          (yield* mailed).map(({ request }) => request.refusal),
          [Option.some("expired")]
        );

        // A business, with a verified VAT number, has no right to withdraw.
        yield* studio("2026-11-05T00:00:00Z");
        yield* Desk.use(({ business }) => Ref.set(business, true));

        const business = yield* send({
          contract: Option.some(reference),
          kind: "withdrawal",
        });

        assert.deepStrictEqual(
          (yield* kept(business)).refusal,
          Option.some("business")
        );
      })
  );

  it.effect(
    "leaves to staff a request no contract is found for, acknowledged all the same",
    () =>
      Effect.gen(function* unmatched() {
        yield* studio("2026-11-10T08:00:00Z");

        const unknown = yield* send({ email: "nobody@example.test" });

        // An account that manages a workspace on the free plan.
        yield* Desk.use(({ held }) => Ref.set(held, []));

        const free = yield* send({});

        for (const id of [unknown, free]) {
          const request = yield* kept(id);

          assert.strictEqual(request.status, "unmatched");
          assert.strictEqual(request.acknowledgement, "sent");
        }

        assert.isTrue(
          (yield* mailed).every(({ token }) => Option.isNone(token))
        );
        assert.deepStrictEqual(
          (yield* (yield* ContractRequestDesk).open).map(({ id }) => id),
          [unknown, free]
        );
      })
  );

  it.effect(
    "stops writing to an address that was sent five acknowledgements in a day, and leaves the rest to staff",
    () =>
      Effect.gen(function* flood() {
        yield* studio("2026-11-10T08:00:00Z");

        const ids = yield* Effect.forEach([1, 2, 3, 4, 5, 6], () => send({}), {
          concurrency: 1,
        });

        assert.lengthOf(yield* mailed, 5);

        const last = yield* kept(ids[5] ?? (yield* send({})));

        assert.strictEqual(last.acknowledgement, "withheld");
        // Without its link, only staff can apply it.
        assert.strictEqual(last.status, "unmatched");

        // More than a day later, the address is written to again.
        yield* TestClock.adjust(Duration.hours(25));
        yield* send({});

        assert.lengthOf(yield* mailed, 6);
      })
  );

  it.effect(
    "catches up on what the mail or Stripe could not take, as of the day the request came",
    () =>
      Effect.gen(function* catchUp() {
        yield* studio("2026-11-30T22:00:00Z");
        yield* Desk.use((desk) =>
          Effect.all([
            Ref.set(desk.mailDown, true),
            Ref.set(desk.stripeDown, true),
          ])
        );

        const function_ = yield* ReceiveContractRequest;
        const numbered = yield* send({ contract: Option.some(reference) });
        const plain = yield* send({ email: "nobody@example.test" });

        // Stripe did not answer: still to apply. The mail did not either.
        assert.strictEqual((yield* kept(numbered)).status, "received");
        assert.strictEqual((yield* kept(plain)).acknowledgement, "pending");
        assert.isEmpty(yield* mailed);

        // Too soon: the request's own run may still be at work.
        assert.strictEqual(yield* function_.catchUp, 0);

        yield* TestClock.adjust(Duration.minutes(10));
        yield* Desk.use((desk) =>
          Effect.all([
            Ref.set(desk.mailDown, false),
            Ref.set(desk.stripeDown, false),
          ])
        );

        assert.strictEqual(yield* function_.catchUp, 2);

        const applied = yield* kept(numbered);

        assert.strictEqual(applied.status, "applied");
        assert.deepStrictEqual(applied.receivedAt, at("2026-11-30T22:00:00Z"));
        assert.strictEqual(applied.acknowledgement, "sent");
        assert.strictEqual((yield* kept(plain)).acknowledgement, "sent");
        assert.lengthOf(yield* mailed, 2);
        assert.strictEqual(yield* function_.catchUp, 0);
      })
  );

  it.effect(
    "lets staff apply a request to a contract, as of the day it came, or close it, each recorded first",
    () =>
      Effect.gen(function* staff() {
        yield* studio("2026-11-10T08:00:00Z");

        const first = yield* send({ email: "nobody@example.test" });
        const second = yield* send({ email: "nobody@example.test" });

        yield* Desk.use(({ mail }) => Ref.set(mail, []));
        yield* TestClock.setTime(at("2026-11-12T10:00:00Z").epochMilliseconds);

        const desk = yield* ContractRequestDesk;

        const applied = yield* desk.apply({
          id: first,
          reason: "Confirmed by phone with the workspace's owner",
          staffId,
          workspaceId,
        });

        assert.strictEqual(applied.status, "applied");
        assert.deepStrictEqual(
          applied.effectiveAt,
          Option.some(at("2026-12-01T00:00:00Z"))
        );
        assert.deepStrictEqual(yield* askedOfStripe, [
          "cancelAtPeriodEnd sub_synthetic_paid",
        ]);
        // Its sender is told what became of it.
        assert.deepStrictEqual(
          (yield* mailed).map(({ request }) => request.status),
          ["applied"]
        );

        const closed = yield* desk.close({
          id: second,
          reason: "Sent twice",
          staffId,
        });

        assert.strictEqual(closed.status, "closed");

        // Ids, the action and the reason: never what the request said.
        assert.deepStrictEqual(
          yield* Desk.use(({ handled }) => Ref.get(handled)),
          [
            {
              action: "apply",
              at: at("2026-11-12T10:00:00Z"),
              reason: "Confirmed by phone with the workspace's owner",
              requestId: first,
              staffId,
              userId: Option.none(),
              workspaceId: Option.some(workspaceId),
            },
            {
              action: "close",
              at: at("2026-11-12T10:00:00Z"),
              reason: "Sent twice",
              requestId: second,
              staffId,
              userId: Option.none(),
              workspaceId: Option.none(),
            },
          ]
        );

        const again = yield* desk
          .apply({ id: first, reason: "Again", staffId, workspaceId })
          .pipe(Effect.flip);

        assert.deepInclude(again, {
          _tag: "ContractRequestSettled",
          status: "applied",
        });
        assert.isEmpty(yield* desk.open);
      })
  );

  it.effect("ends the contract on the day asked for, when it is later", () =>
    Effect.gen(function* onDate() {
      yield* studio("2026-11-10T08:00:00Z");

      const id = yield* send({
        contract: Option.some(reference),
        desiredAt: Option.some(at("2027-02-16T00:00:00Z")),
      });

      assert.deepStrictEqual(
        (yield* kept(id)).effectiveAt,
        Option.some(at("2027-02-16T00:00:00Z"))
      );
      assert.deepStrictEqual(yield* askedOfStripe, [
        "cancelAt sub_synthetic_paid 2027-02-16T00:00:00.000Z",
      ]);
    })
  );
});

layer(UseCases.pipe(Layer.provideMerge(deskPorts(false))))(
  "requests on a server that does not bill",
  (it) => {
    it.effect("are refused: there is no contract to end", () =>
      Effect.gen(function* off() {
        const refused = yield* (yield* ReceiveContractRequest)
          .receive(form())
          .pipe(Effect.flip);

        assert.strictEqual(refused._tag, "BillingOff");
      })
    );
  }
);
