import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Layer } from "effect";

import { SignUpGate } from "#workspace/application/sign-up-gate.ts";
import { SignUpSettings } from "#workspace/application/sign-up-settings.ts";
import { SignUpStore } from "#workspace/application/sign-up-store.ts";
import type { SignUpMode } from "#workspace/domain/sign-up-mode.ts";

// Who the gate lets make an account, on stores that answer what each case
// needs: the route itself is tested on a database in
// test/workspace/integration/sign-up-gate.test.ts, whose server always has
// accounts already, so the first account is tested here.

interface Server {
  readonly accounts: boolean;
  readonly invited: readonly string[];
}

const asked: string[] = [];

const gate = (mode: SignUpMode, server: Server) =>
  SignUpGate.layer.pipe(
    Layer.provide(
      Layer.merge(
        SignUpSettings.layerTest(mode),
        Layer.succeed(
          SignUpStore,
          SignUpStore.of({
            hasAccounts: () => Effect.succeed(server.accounts),
            hasPendingInvitation: (email, at) => {
              asked.push(`${email} ${DateTime.formatIso(at)}`);

              return Effect.succeed(server.invited.includes(email));
            },
          })
        )
      )
    )
  );

const mayRegister = (email: string) =>
  SignUpGate.use((signUps) => signUps.mayRegister(email));

describe(SignUpGate, () => {
  it.effect("lets anyone in on an open server, asking nothing", () =>
    Effect.gen(function* open() {
      asked.length = 0;

      assert.isTrue(yield* mayRegister("anyone@example.test"));
      assert.deepStrictEqual(asked, []);
    }).pipe(Effect.provide(gate("open", { accounts: true, invited: [] })))
  );

  it.effect("lets an invited address in, as Better Auth compares them", () =>
    Effect.gen(function* invited() {
      assert.isTrue(yield* mayRegister("Ada@Example.TEST"));
      assert.isTrue(yield* mayRegister(" ada@example.test "));
    }).pipe(
      Effect.provide(
        gate("invitation", { accounts: true, invited: ["ada@example.test"] })
      )
    )
  );

  it.effect("refuses an address without an invitation", () =>
    Effect.gen(function* uninvited() {
      assert.isFalse(yield* mayRegister("grace@example.test"));
    }).pipe(
      Effect.provide(
        gate("invitation", { accounts: true, invited: ["ada@example.test"] })
      )
    )
  );

  it.effect("lets the first account of an empty server in", () =>
    Effect.gen(function* first() {
      assert.isTrue(yield* mayRegister("owner@example.test"));
    }).pipe(
      Effect.provide(gate("invitation", { accounts: false, invited: [] }))
    )
  );
});
