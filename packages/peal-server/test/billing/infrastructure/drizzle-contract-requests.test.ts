// Requests to cancel or withdraw in Postgres: what a link's token finds,
// what waits for staff or for its acknowledgement, and what erasing a
// workspace, forgetting a user and the retention leave of them.
import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer, Option } from "effect";

import { ContractReferences } from "#billing/application/ports/contract-references.ts";
import { ContractRequests } from "#billing/application/ports/contract-requests.ts";
import { readReference } from "#billing/domain/contract-reference.ts";
import {
  changed,
  ContractRequest,
  ContractRequestIdSchema,
} from "#billing/domain/contract-request.ts";
import type { ContractRequestFields } from "#billing/domain/contract-request.ts";
import { contractCutoff } from "#billing/domain/contract-retention.ts";
import { DrizzleContractRequestsLive } from "#billing/infrastructure/drizzle-contract-requests.ts";
import { KeyedContractReferencesLive } from "#billing/infrastructure/keyed-contract-references.ts";
import { newId } from "#shared/application/ids.ts";
import { UserIdSchema } from "#shared/domain/ids.ts";
import { DatabaseTest, freshWorkspace } from "#test/channels/support.ts";

const StoreTest = Layer.mergeAll(
  DrizzleContractRequestsLive,
  KeyedContractReferencesLive
).pipe(Layer.provideMerge(DatabaseTest));

const at = (iso: string) => DateTime.makeUnsafe(iso);

const freshUser = freshWorkspace.pipe(
  Effect.map((id) => UserIdSchema.make(id))
);

// A form's request as it is first recorded, at an instant no other suite
// uses.
const received = Effect.fn("received")(function* received(
  fields: Partial<ContractRequestFields> = {}
) {
  const id = yield* newId(ContractRequestIdSchema);

  return new ContractRequest({
    acknowledgedAt: Option.none(),
    acknowledgement: "pending",
    channel: "form",
    contract: Option.some("Synthetic Studio"),
    effectiveAt: Option.none(),
    email: Option.some(`holder+${id}@example.test`),
    id,
    kind: "cancellation",
    locale: "fr",
    name: Option.some("Camille Synthetic"),
    receivedAt: at("2019-03-04T10:00:00Z"),
    refunded: Option.none(),
    refusal: Option.none(),
    settledAt: Option.none(),
    status: "received",
    stripeSubscriptionId: Option.none(),
    userId: Option.none(),
    workspaceId: Option.none(),
    ...fields,
  });
});

layer(StoreTest, { timeout: 60_000 })("contract requests in Postgres", (it) => {
  it.effect("keep a request as it was received, then as it ended", () =>
    Effect.gen(function* saved() {
      const store = yield* ContractRequests;
      const request = yield* received();

      yield* store.save(request);

      assert.deepStrictEqual(
        yield* store.byId(request.id),
        Option.some(request)
      );

      const workspaceId = yield* freshWorkspace;

      const applied = changed(request, {
        acknowledgedAt: Option.some(at("2019-03-04T10:00:05Z")),
        acknowledgement: "sent",
        effectiveAt: Option.some(at("2019-04-01T00:00:00Z")),
        refunded: Option.some({ amount: 450, currency: "eur" }),
        settledAt: Option.some(at("2019-03-04T10:00:04Z")),
        status: "applied",
        stripeSubscriptionId: Option.some(`sub_${request.id}`),
        workspaceId: Option.some(workspaceId),
      });

      yield* store.save(applied);

      assert.deepStrictEqual(
        yield* store.byId(request.id),
        Option.some(applied)
      );
    })
  );

  it.effect(
    "open a request by its link's digest only while it awaits and the link holds",
    () =>
      Effect.gen(function* confirmation() {
        const store = yield* ContractRequests;

        const request = yield* received({ status: "awaitingConfirmation" });
        const digest = `digest-${request.id}`;

        yield* store.save(request);
        yield* store.setConfirmation(
          request.id,
          digest,
          at("2019-04-03T10:00:00Z")
        );

        const found = yield* store.byConfirmation(
          digest,
          at("2019-03-05T10:00:00Z")
        );

        assert.deepStrictEqual(
          found.pipe(Option.map(({ id }) => id)),
          Option.some(request.id)
        );
        assert.isTrue(
          Option.isNone(
            yield* store.byConfirmation(digest, at("2019-04-03T10:00:00Z"))
          )
        );
        assert.isTrue(
          Option.isNone(
            yield* store.byConfirmation(
              `other-${request.id}`,
              at("2019-03-05T10:00:00Z")
            )
          )
        );

        // Saved again, as when it is applied, it keeps no link to follow.
        yield* store.save(changed(request, { status: "applied" }));

        assert.isTrue(
          Option.isNone(
            yield* store.byConfirmation(digest, at("2019-03-05T10:00:00Z"))
          )
        );
      })
  );

  it.effect(
    "list what waits for staff, and what waits to be acknowledged",
    () =>
      Effect.gen(function* waiting() {
        const store = yield* ContractRequests;

        const unmatched = yield* received({
          acknowledgedAt: Option.some(at("2019-03-04T10:00:05Z")),
          acknowledgement: "sent",
          status: "unmatched",
        });

        const fresh = yield* received();

        const applied = yield* received({
          acknowledgedAt: Option.some(at("2019-03-04T10:00:05Z")),
          acknowledgement: "sent",
          status: "applied",
        });

        yield* Effect.forEach([unmatched, fresh, applied], store.save);

        const open = (yield* store.open(1000)).map(({ id }) => id);

        assert.include(open, unmatched.id);
        assert.notInclude(open, fresh.id);
        assert.notInclude(open, applied.id);

        const pending = (yield* store.pending(
          at("2019-03-04T10:05:00Z"),
          1000
        )).map(({ id }) => id);

        assert.include(pending, fresh.id);
        assert.notInclude(pending, unmatched.id);
        assert.isEmpty(
          (yield* store.pending(at("2019-03-04T10:00:00Z"), 1000)).filter(
            ({ id }) => id === fresh.id
          )
        );
      })
  );

  it.effect("count the acknowledgements an address was sent", () =>
    Effect.gen(function* counted() {
      const store = yield* ContractRequests;
      const first = yield* received();
      const email = Option.getOrThrow(first.email);

      yield* store.save(
        changed(first, {
          acknowledgedAt: Option.some(at("2019-03-04T10:00:05Z")),
          acknowledgement: "sent",
        })
      );
      yield* store.save(yield* received({ email: Option.some(email) }));

      assert.strictEqual(
        yield* store.acknowledgedTo(email, at("2019-03-04T00:00:00Z")),
        1
      );
      assert.strictEqual(
        yield* store.acknowledgedTo(email, at("2019-03-05T00:00:00Z")),
        0
      );
    })
  );

  it.effect(
    "leave an erased workspace's requests without it, a forgotten user's without them, for five years",
    () =>
      Effect.gen(function* retention() {
        const store = yield* ContractRequests;
        const workspaceId = yield* freshWorkspace;
        const userId = yield* freshUser;

        const request = yield* received({
          status: "applied",
          userId: Option.some(userId),
          workspaceId: Option.some(workspaceId),
        });

        yield* store.save(request);

        assert.lengthOf(yield* store.ofUser(userId), 1);

        // The test's clock stands at the epoch: erased on 1 January 1970.
        yield* store.eraseWorkspace(workspaceId);
        yield* store.forgetUser(userId);

        const kept = Option.getOrThrow(yield* store.byId(request.id));

        assert.isTrue(Option.isNone(kept.workspaceId));
        assert.isTrue(Option.isNone(kept.userId));
        assert.isTrue(Option.isNone(kept.name));
        assert.isTrue(Option.isNone(kept.email));
        assert.isEmpty(yield* store.ofUser(userId));

        // Five years from the erasure, not from the request.
        yield* store.purge(contractCutoff(at("1974-12-31T00:00:00Z")));

        assert.isTrue(Option.isSome(yield* store.byId(request.id)));

        yield* store.purge(contractCutoff(at("1975-01-02T00:00:00Z")));

        assert.isTrue(Option.isNone(yield* store.byId(request.id)));
      })
  );

  it.effect(
    "keep a request no contract was found for five years from its receipt",
    () =>
      Effect.gen(function* unmatchedRetention() {
        const store = yield* ContractRequests;
        const request = yield* received({ status: "unmatched" });

        yield* store.save(request);
        yield* store.purge(contractCutoff(at("2024-03-03T00:00:00Z")));

        assert.isTrue(Option.isSome(yield* store.byId(request.id)));

        yield* store.purge(contractCutoff(at("2024-03-05T00:00:00Z")));

        assert.isTrue(Option.isNone(yield* store.byId(request.id)));
      })
  );

  it.effect("give a subscription one contract number, which finds it", () =>
    Effect.gen(function* references() {
      const store = yield* ContractReferences;
      const subscription = `sub_${yield* newId(ContractRequestIdSchema)}`;
      const reference = yield* store.issue(subscription);

      assert.deepStrictEqual(readReference(reference), Option.some(reference));
      assert.strictEqual(yield* store.issue(subscription), reference);
      assert.notStrictEqual(yield* store.issue(`${subscription}x`), reference);
      assert.deepStrictEqual(
        yield* store.find(reference),
        Option.some(subscription)
      );
      assert.isTrue(Option.isNone(yield* store.find("0000-0000-0000")));
    })
  );
});
