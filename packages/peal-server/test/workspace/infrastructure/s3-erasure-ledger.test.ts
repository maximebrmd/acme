// The erasure ledger on the development stack's SeaweedFS, under a prefix
// of this run's own, so other suites' entries never show.
import { randomUUID } from "node:crypto";

import { assert, layer } from "@effect/vitest";
import { ConfigProvider, DateTime, Effect, Layer } from "effect";

import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { ErasureLedger } from "#workspace/application/erasure-ledger.ts";
import { ErasureEntryIdSchema } from "#workspace/domain/erasure-ledger.ts";
import type { ErasureEntry } from "#workspace/domain/erasure-ledger.ts";
import { S3ErasureLedger } from "#workspace/infrastructure/s3-erasure-ledger.ts";

const prefix = `tests/ledger/${randomUUID()}/`;

const LedgerTest = S3ErasureLedger.pipe(
  Layer.provide(
    ConfigProvider.layerAdd(
      ConfigProvider.fromUnknown({
        PEAL_S3_ACCESS_KEY_ID: "peal",
        PEAL_S3_BUCKET: "peal-media",
        PEAL_S3_ENDPOINT: "http://127.0.0.1:18333",
        PEAL_S3_FORCE_PATH_STYLE: "true",
        PEAL_S3_KEY_PREFIX: prefix,
        PEAL_S3_SECRET_ACCESS_KEY: "peal-development-secret",
      }),
      { asPrimary: true }
    )
  )
);

// A UUIDv7 made at `at`, as the Ids port issues them: they sort by time.
const idAt = (at: DateTime.Utc) => {
  const millis = DateTime.toEpochMillis(at).toString(16).padStart(12, "0");
  const random = randomUUID().replaceAll("-", "");

  return ErasureEntryIdSchema.make(
    `${millis.slice(0, 8)}-${millis.slice(8)}-7${random.slice(0, 3)}-8${random.slice(3, 6)}-${random.slice(6, 18)}`
  );
};

const entryAt = (
  iso: string,
  fields: Partial<ErasureEntry> = {}
): ErasureEntry => {
  const at = DateTime.makeUnsafe(iso);

  return {
    at,
    confirmed: false,
    id: idAt(at),
    userId: null,
    version: 1,
    workspaceIds: [WorkspaceIdSchema.make(randomUUID())],
    ...fields,
  };
};

layer(LedgerTest)("the erasure ledger in the object store", (it) => {
  it.effect(
    "keeps each erasure's ids and time, oldest first, confirmed once its transaction committed",
    () =>
      Effect.gen(function* keeps() {
        const ledger = yield* ErasureLedger;

        const closure = entryAt("2026-11-02T10:00:00Z", {
          userId: UserIdSchema.make(randomUUID()),
        });

        const deletion = entryAt("2026-11-01T09:00:00Z");
        const failed = entryAt("2026-11-03T11:00:00Z");

        yield* ledger.record(closure);
        yield* ledger.record(deletion);
        yield* ledger.record(failed);

        assert.deepStrictEqual(yield* ledger.entries, [
          deletion,
          closure,
          failed,
        ]);

        // The closure committed; the last erasure's transaction failed.
        yield* ledger.record({ ...closure, confirmed: true });
        yield* ledger.discard(failed.id);
        // Discarding what is not there changes nothing.
        yield* ledger.discard(failed.id);

        assert.deepStrictEqual(yield* ledger.entries, [
          deletion,
          { ...closure, confirmed: true },
        ]);
      })
  );

  it.effect("drops the entries older than the cutoff, and no other", () =>
    Effect.gen(function* expires() {
      const ledger = yield* ErasureLedger;
      const before = yield* ledger.entries;

      const expired = yield* ledger.expire(
        DateTime.makeUnsafe("2026-11-01T12:00:00Z")
      );

      assert.strictEqual(expired, 1);
      assert.deepStrictEqual(yield* ledger.entries, before.slice(1));

      // Leave the store as it was found.
      assert.strictEqual(
        yield* ledger.expire(DateTime.makeUnsafe("2027-01-01T00:00:00Z")),
        1
      );
      assert.deepStrictEqual(yield* ledger.entries, []);
    })
  );
});
