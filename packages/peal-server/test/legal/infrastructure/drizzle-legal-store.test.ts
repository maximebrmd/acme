// The legal records on Postgres. Records are written in the 1880s, before
// any other suite's, so the purge's cutoffs touch nothing else.
import { randomUUID } from "node:crypto";

import { assert, layer } from "@effect/vitest";
import {
  ConfigProvider,
  Context,
  DateTime,
  Effect,
  Layer,
  Schema,
} from "effect";
import { SqlClient } from "effect/sql";
import { TestClock } from "effect/testing";

import { LegalRecords } from "#legal/application/legal-records.ts";
import { LegalStore } from "#legal/application/ports/legal-store.ts";
import type {
  ConnectionEntry,
  HeldAccount,
} from "#legal/application/ports/legal-store.ts";
import { PurgeLegalRecords } from "#legal/application/purge-legal-records.ts";
import { LegalLive } from "#legal/container.ts";
import { LegalRecordIdSchema } from "#legal/domain/legal-record-id.ts";
import { legalCutoffs } from "#legal/domain/legal-retention.ts";
import { DrizzleLegalStore } from "#legal/infrastructure/drizzle-legal-store.ts";
import { DatabaseTest } from "#test/channels/support.ts";

const at = (iso: string) => DateTime.makeUnsafe(iso);

// A random UUID with the version digit of v7 reads as one.
const uuid7 = () => {
  const random = randomUUID();

  return LegalRecordIdSchema.make(`${random.slice(0, 14)}7${random.slice(15)}`);
};

const StoreTest = DrizzleLegalStore.pipe(Layer.provideMerge(DatabaseTest));

const store = Effect.context<LegalStore>().pipe(
  Effect.map(Context.get(LegalStore))
);

const heldAccount = (
  closedAt: string,
  overrides: Partial<HeldAccount> = {}
): HeldAccount => ({
  accountCreatedAt: at("1880-01-01T00:00:00Z"),
  closedAt: at(closedAt),
  email: `held+${randomUUID()}@example.test`,
  id: uuid7(),
  name: "Synthetic Holder",
  signInMethods: [{ accountId: randomUUID(), provider: "credential" }],
  stripeCustomerIds: ["cus_synthetic"],
  userId: randomUUID(),
  ...overrides,
});

const connection = (
  made: string,
  overrides: Partial<ConnectionEntry> = {}
): ConnectionEntry => ({
  access: "session",
  apiKeyId: null,
  at: at(made),
  id: uuid7(),
  ipAddress: "192.0.2.10",
  protocol: "https",
  userId: randomUUID(),
  workspaceId: randomUUID(),
  ...overrides,
});

const CountSchema = Schema.Array(Schema.Struct({ count: Schema.Number }));

layer(StoreTest)("the legal records", (it) => {
  it.effect(
    "find a closed account by its address, whatever its case, or by its id, with the connections of the account or its workspace",
    () =>
      Effect.gen(function* finds() {
        const legal = yield* store;

        const holder = heldAccount("1885-03-01T00:00:00Z", {
          email: `Mixed.Case+${randomUUID()}@Example.test`,
        });

        yield* legal.hold(holder);

        const byEmail = yield* legal.held({
          email: holder.email.toLowerCase(),
        });

        assert.deepStrictEqual(byEmail, [holder]);
        assert.deepStrictEqual(yield* legal.held({ userId: holder.userId }), [
          holder,
        ]);
        assert.deepStrictEqual(
          yield* legal.held({ email: "nobody@example.test" }),
          []
        );

        const own = connection("1885-02-01T00:00:00Z", {
          userId: holder.userId,
        });

        const keyed = connection("1885-02-02T00:00:00Z", {
          access: "apiKey",
          apiKeyId: "synthetic-key",
          userId: null,
        });

        const other = connection("1885-02-03T00:00:00Z");

        for (const made of [own, keyed, other]) {
          yield* legal.connect(made);
        }

        assert.deepStrictEqual(
          yield* legal.connections({
            userIds: [holder.userId],
            workspaceIds: [keyed.workspaceId ?? ""],
          }),
          [own, keyed]
        );

        const sql = yield* SqlClient.SqlClient;

        yield* sql`DELETE FROM legal.identification_holds WHERE id = ${holder.id}`;
        yield* sql`DELETE FROM legal.connections WHERE id IN (${own.id}, ${keyed.id}, ${other.id})`;
      })
  );

  it.effect(
    "keep who held an account 5 years and how they signed in 1 year, connections 1 year, answers 5 years",
    () =>
      Effect.gen(function* purges() {
        const legal = yield* store;
        const sql = yield* SqlClient.SqlClient;
        const now = at("1890-01-01T00:00:00Z");

        const gone = heldAccount("1884-12-01T00:00:00Z");
        const trimmed = heldAccount("1888-06-01T00:00:00Z");
        const whole = heldAccount("1889-06-01T00:00:00Z");

        for (const holder of [gone, trimmed, whole]) {
          yield* legal.hold(holder);
        }

        const old = connection("1888-12-01T00:00:00Z");
        const recent = connection("1889-02-01T00:00:00Z");

        yield* legal.connect(old);
        yield* legal.connect(recent);

        const answered = (made: string) => ({
          at: at(made),
          authority: "Synthetic court",
          connections: 0,
          held: 1,
          id: uuid7(),
          reference: "Synthetic requisition 1",
          staffId: randomUUID(),
          subject: { userId: whole.userId },
        });

        const oldAnswer = answered("1884-12-01T00:00:00Z");
        const recentAnswer = answered("1885-02-01T00:00:00Z");

        yield* legal.disclose(oldAnswer);
        yield* legal.disclose(recentAnswer);

        // In batches of one: each kind runs until nothing is left.
        let changed = 0;
        let batch = 1;

        while (batch > 0) {
          batch = yield* legal.purgeBatch(legalCutoffs(now), 1);
          changed += batch;
        }

        assert.strictEqual(changed, 4);

        assert.deepStrictEqual(yield* legal.held({ userId: gone.userId }), []);
        assert.deepStrictEqual(yield* legal.held({ userId: trimmed.userId }), [
          {
            ...trimmed,
            signInMethods: [],
            stripeCustomerIds: [],
          },
        ]);
        assert.deepStrictEqual(yield* legal.held({ userId: whole.userId }), [
          whole,
        ]);

        const left = yield* legal.connections({
          userIds: [old.userId ?? "", recent.userId ?? ""],
          workspaceIds: [],
        });

        assert.deepStrictEqual(left, [recent]);

        const answers =
          yield* sql`SELECT count(*)::int AS count FROM legal.disclosures WHERE id IN (${oldAnswer.id}, ${recentAnswer.id})`.pipe(
            Effect.flatMap(Schema.decodeUnknownEffect(CountSchema)),
            Effect.orDie
          );

        assert.strictEqual(answers[0]?.count, 1);

        yield* sql`DELETE FROM legal.identification_holds WHERE closed_at < '1891-01-01'`;
        yield* sql`DELETE FROM legal.connections WHERE at < '1891-01-01'`;
        yield* sql`DELETE FROM legal.disclosures WHERE at < '1891-01-01'`;
      })
  );
});

// A server that kept legal records, then turned the retention off
// (`PEAL_LEGAL_RETENTION=false`): the daily purge still ends what it holds.
// In this file, so no other suite's purge runs meanwhile; its records are
// written in the 1840s and purged at 1850.
const TurnedOff = LegalLive.pipe(
  Layer.provide(
    ConfigProvider.layerAdd(
      ConfigProvider.fromUnknown({ PEAL_LEGAL_RETENTION: "false" }),
      { asPrimary: true }
    )
  ),
  Layer.provideMerge(DatabaseTest)
);

layer(TurnedOff)("legal retention turned off", (it) => {
  it.effect(
    "keeps nothing new, and still purges what it kept once its time is up",
    () =>
      Effect.gen(function* purges() {
        const sql = yield* SqlClient.SqlClient;
        const records = yield* LegalRecords;
        const purging = yield* PurgeLegalRecords;
        const userId = randomUUID();

        yield* TestClock.setTime(
          DateTime.toEpochMillis(DateTime.makeUnsafe("1850-01-01T00:00:00Z"))
        );

        // Kept while it was on: one past its year, one within it.
        yield* sql`INSERT INTO legal.connections (id, access, at, protocol, user_id)
          VALUES (${uuid7()}, 'session', ${new Date("1848-06-01T00:00:00Z")}, 'https', ${userId}),
                 (${uuid7()}, 'session', ${new Date("1849-06-01T00:00:00Z")}, 'https', ${userId})`;

        yield* records.connected({
          access: "session",
          apiKeyId: null,
          ipAddress: "192.0.2.10",
          protocol: "https",
          userId,
          workspaceId: null,
        });

        assert.strictEqual(yield* purging.purge, 1);

        const left =
          yield* sql`SELECT count(*)::int AS count FROM legal.connections WHERE user_id = ${userId}`.pipe(
            Effect.flatMap(Schema.decodeUnknownEffect(CountSchema))
          );

        assert.deepStrictEqual(left, [{ count: 1 }]);
        assert.strictEqual(
          (yield* records.exportUser(userId))?.connections.length,
          1
        );

        yield* sql`DELETE FROM legal.connections WHERE user_id = ${userId}`;

        assert.isNull(yield* records.exportUser(userId));
      })
  );
});
