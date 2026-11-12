// Who a credential is, on ports in memory: an OAuth client's token bound to
// a workspace says what it may do there, as `ResolveMember` decides it,
// and a workspace that refuses the person is named as refusing.
import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer, Option, Result } from "effect";

import { Actor } from "#shared/domain/access.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { Accounts } from "#workspace/application/accounts.ts";
import { ApiKeyIssuer } from "#workspace/application/api-key-issuer.ts";
import { CredentialCheck } from "#workspace/application/credential-check.ts";
import { CustomerWorkspaces } from "#workspace/application/customer-workspaces.ts";
import { PartnerStore } from "#workspace/application/partner-store.ts";
import { ResolveMember } from "#workspace/application/resolve-member.ts";
import { Account } from "#workspace/domain/account.ts";
import { NotAMember } from "#workspace/domain/not-a-member.ts";
import { TwoStepRequired } from "#workspace/domain/two-step-required.ts";
import { UserPrincipal } from "#workspace/domain/user-principal.ts";

const userId = UserIdSchema.make("3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f");

const open = WorkspaceIdSchema.make("4d5e6f7a-8b9c-4d0e-9f1a-2b3c4d5e6f70");

const strict = WorkspaceIdSchema.make("5e6f7a8b-9c0d-4e1f-8a2b-3c4d5e6f7a81");

const left = WorkspaceIdSchema.make("6f7a8b9c-0d1e-4f2a-9b3c-4d5e6f7a8b92");

// Not among the account's workspaces any more.
const gone = WorkspaceIdSchema.make("7a8b9c0d-1e2f-4a3b-8c4d-5e6f7a8b9ca3");

const staffId = UserIdSchema.make("8b9c0d1e-2f3a-4b4c-9d5e-6f7a8b9c0db4");

const account = new Account({
  ban: Option.none(),
  email: "synthetic@example.test",
  emailVerified: true,
  id: userId,
  image: Option.none(),
  locale: "en",
  name: "Synthetic person",
  twoStepEnabled: false,
  workspaces: [
    { id: open, name: "Open studio", role: "editor", slug: "open" },
    { id: strict, name: "Strict studio", role: "owner", slug: "strict" },
    { id: left, name: "Left studio", role: "viewer", slug: "left" },
  ],
});

const principalBoundTo = (workspaceId: Option.Option<WorkspaceId>) =>
  new UserPrincipal({
    impersonatedBy: Option.none(),
    oauth: Option.some({
      clientId: "synthetic-agent",
      scopes: ["workspace:read"],
      workspaceId,
    }),
    userId,
  });

const CheckTest = CredentialCheck.layer.pipe(
  Layer.provide(
    Layer.mergeAll(
      Layer.mock(Accounts, {
        current: (principal) =>
          Effect.succeed({ account, principal, workspaces: [] }),
      }),
      Layer.mock(ResolveMember, {
        resolveMany: (_principal, [workspaceId]) =>
          Effect.succeed(
            new Map(
              workspaceId === undefined
                ? []
                : [
                    [
                      workspaceId,
                      workspaceId === open
                        ? Result.succeed(
                            new Actor({
                              permissions: ["post:read"],
                              subject: {
                                _tag: "user",
                                impersonatedBy: Option.none(),
                                userId,
                              },
                              workspaceId,
                            })
                          )
                        : Result.fail(
                            workspaceId === strict
                              ? new TwoStepRequired({ workspaceId })
                              : new NotAMember({ workspaceId })
                          ),
                    ],
                  ]
            )
          ),
      }),
      Layer.mock(ApiKeyIssuer, {}),
      Layer.mock(PartnerStore, {}),
      Layer.mock(CustomerWorkspaces, {})
    )
  )
);

const workspaceOf = (workspaceId: Option.Option<WorkspaceId>) =>
  CredentialCheck.use((check) =>
    check.describe(principalBoundTo(workspaceId))
  ).pipe(
    Effect.map((described) =>
      described._tag === "user"
        ? described.application.pipe(Option.map(({ binding }) => binding))
        : Option.none()
    ),
    Effect.provide(CheckTest)
  );

describe(CredentialCheck, () => {
  it.effect(
    "says what a token may do in the workspace it is bound to, as the workspace decides it",
    () =>
      Effect.gen(function* bound() {
        assert.deepStrictEqual(
          yield* workspaceOf(Option.some(open)),
          Option.some({
            _tag: "bound",
            id: open,
            name: "Open studio",
            permissions: ["post:read"],
            refused: Option.none(),
          })
        );
      })
  );

  it.effect(
    "names a workspace that refuses the person, and lets nothing be done there",
    () =>
      Effect.gen(function* refused() {
        assert.deepStrictEqual(
          yield* workspaceOf(Option.some(strict)),
          Option.some({
            _tag: "bound",
            id: strict,
            name: "Strict studio",
            permissions: [],
            refused: Option.some("twoStepRequired"),
          })
        );
      })
  );

  it.effect(
    "tells a token bound to a workspace the person left from one bound to none",
    () =>
      Effect.gen(function* none() {
        assert.deepStrictEqual(
          yield* workspaceOf(Option.some(left)),
          Option.some({ _tag: "left", id: left })
        );
        assert.deepStrictEqual(
          yield* workspaceOf(Option.some(gone)),
          Option.some({ _tag: "left", id: gone })
        );
        assert.deepStrictEqual(
          yield* workspaceOf(Option.none()),
          Option.some({ _tag: "unbound" })
        );
      })
  );

  it.effect("names staff who act as the person in their session", () =>
    Effect.gen(function* impersonated() {
      const described = yield* CredentialCheck.use((check) =>
        check.describe(
          new UserPrincipal({
            impersonatedBy: Option.some(staffId),
            userId,
          })
        )
      ).pipe(Effect.provide(CheckTest));

      assert.deepStrictEqual(
        described._tag === "user" ? described.impersonatedBy : Option.none(),
        Option.some(staffId)
      );
    })
  );
});
