import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";

import { SignUpGate } from "#workspace/application/sign-up-gate.ts";
import { SignUpSettings } from "#workspace/application/sign-up-settings.ts";
import { SignUpStore } from "#workspace/application/sign-up-store.ts";
import type { SignUpMode } from "#workspace/domain/sign-up-mode.ts";

// Who the gate lets make an account, on stores that answer what each case
// needs: the route itself is tested on a database in
// test/workspace/integration/sign-up-gate.test.ts, whose server always has
// accounts already, so the first account is tested here.

const invitationId = "0190f3a0-0000-7000-8000-00000000e001";
const otherInvitationId = "0190f3a0-0000-7000-8000-00000000e002";

interface Server {
  readonly accounts: boolean;
  // Each pending invitation, by its id, with the address it went to.
  readonly invitations: Readonly<Record<string, string>>;
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
            hasAccounts: () => {
              asked.push("accounts");

              return Effect.succeed(server.accounts);
            },
            invitationTo: (id, email) => {
              asked.push(`invitation ${id}`);

              return Effect.succeed(server.invitations[id] === email);
            },
          })
        )
      )
    )
  );

const mayRegister = (email: string, invitation = Option.none<string>()) =>
  SignUpGate.use((signUps) => signUps.mayRegister(email, invitation));

const modeNow = SignUpGate.use((signUps) => signUps.modeNow());

const invited: Server = {
  accounts: true,
  invitations: { [invitationId]: "ada@example.test" },
};

describe(SignUpGate, () => {
  it.effect("lets anyone in on an open server, asking nothing", () =>
    Effect.gen(function* open() {
      asked.length = 0;

      assert.isTrue(yield* mayRegister("anyone@example.test"));
      assert.strictEqual(yield* modeNow, "open");
      assert.deepStrictEqual(asked, []);
    }).pipe(Effect.provide(gate("open", invited)))
  );

  it.effect("lets in the address of the invitation it names", () =>
    Effect.gen(function* withInvitation() {
      assert.isTrue(
        yield* mayRegister("ada@example.test", Option.some(invitationId))
      );
      // Better Auth lower-cases the address it stores.
      assert.isTrue(
        yield* mayRegister("Ada@Example.TEST", Option.some(invitationId))
      );
    }).pipe(Effect.provide(gate("invitation", invited)))
  );

  it.effect("refuses an invited address that names no invitation", () =>
    Effect.gen(function* withoutInvitation() {
      assert.isFalse(yield* mayRegister("ada@example.test"));
    }).pipe(Effect.provide(gate("invitation", invited)))
  );

  it.effect("refuses an invitation's id with another address", () =>
    Effect.gen(function* otherAddress() {
      assert.isFalse(
        yield* mayRegister("grace@example.test", Option.some(invitationId))
      );
      assert.isFalse(
        yield* mayRegister("ada@example.test", Option.some(otherInvitationId))
      );
    }).pipe(Effect.provide(gate("invitation", invited)))
  );

  it.effect("checks the address exactly as it would be stored", () =>
    Effect.gen(function* untrimmed() {
      assert.isFalse(
        yield* mayRegister(" ada@example.test", Option.some(invitationId))
      );
    }).pipe(Effect.provide(gate("invitation", invited)))
  );

  it.effect("reads no invitation for an id that is not one", () =>
    Effect.gen(function* notAnId() {
      asked.length = 0;

      assert.isFalse(
        yield* mayRegister("ada@example.test", Option.some("not-an-id"))
      );
      assert.deepStrictEqual(asked, ["accounts"]);
    }).pipe(Effect.provide(gate("invitation", invited)))
  );

  it.effect("lets the first account of an empty server in, and says so", () =>
    Effect.gen(function* first() {
      assert.isTrue(yield* mayRegister("owner@example.test"));
      assert.strictEqual(yield* modeNow, "open");
    }).pipe(
      Effect.provide(gate("invitation", { accounts: false, invitations: {} }))
    )
  );

  it.effect("says invitation once the server has an account", () =>
    Effect.gen(function* afterFirst() {
      assert.strictEqual(yield* modeNow, "invitation");
    }).pipe(Effect.provide(gate("invitation", invited)))
  );
});
