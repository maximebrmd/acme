// Whose standing decides each credential's rate limit: the workspaces the
// limiter is handed for a key, a partner key and an OAuth application,
// bound to a workspace or not.
import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Layer, Option } from "effect";

import { RequestLimiter } from "#activity/application/request-limiter.ts";
import type { LimitHolder } from "#activity/application/request-limiter.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { MemberDirectory } from "#workspace/application/member-directory.ts";
import { PartnerStore } from "#workspace/application/partner-store.ts";
import { RequestLimits } from "#workspace/application/request-limits.ts";
import { Account } from "#workspace/domain/account.ts";
import { ApiKeyPrincipal } from "#workspace/domain/api-key-principal.ts";
import {
  PartnerIdSchema,
  PartnerKeyIdSchema,
} from "#workspace/domain/partner-id.ts";
import { PartnerKeyPrincipal } from "#workspace/domain/partner-key-principal.ts";
import { Partner } from "#workspace/domain/partner.ts";
import type { Principal } from "#workspace/domain/principal.ts";
import { UserPrincipal } from "#workspace/domain/user-principal.ts";
import { CountedRequestLimits } from "#workspace/infrastructure/counted-request-limits.ts";

const home = WorkspaceIdSchema.make("00000000-0000-4000-8000-0000000000a1");
const own = WorkspaceIdSchema.make("00000000-0000-4000-8000-0000000000a2");
const other = WorkspaceIdSchema.make("00000000-0000-4000-8000-0000000000a3");
const userId = UserIdSchema.make("00000000-0000-4000-8000-0000000000b1");
const partnerId = PartnerIdSchema.make("0190f3a0-0000-7000-8000-0000000000c1");

const membership = (id: typeof own) => ({
  id,
  name: "Synthetic",
  role: "owner",
  slug: `synthetic-${id.slice(-2)}`,
});

const Fakes = Layer.mergeAll(
  Layer.mock(PartnerStore, {
    get: () =>
      Effect.succeed(
        Option.some(
          new Partner({
            createdAt: DateTime.makeUnsafe(0),
            id: partnerId,
            logoUrl: Option.none(),
            name: "Synthetic partner",
            returnOrigins: [],
            updatedAt: DateTime.makeUnsafe(0),
            workspaceId: home,
          })
        )
      ),
  }),
  Layer.mock(MemberDirectory, {
    account: () =>
      Effect.succeed(
        Option.some(
          new Account({
            ban: Option.none(),
            email: "limits@example.com",
            emailVerified: true,
            id: userId,
            image: Option.none(),
            locale: "en",
            name: "Synthetic",
            twoStepEnabled: false,
            workspaces: [membership(own), membership(other)],
          })
        )
      ),
  })
);

// The holder each principal is admitted under, and its workspaces.
const holderOf = (principal: Principal) =>
  Effect.gen(function* handedHolder() {
    let handed: LimitHolder | undefined;

    const limiter = Layer.succeed(
      RequestLimiter,
      RequestLimiter.of({
        admit: (_subject, holder) => {
          handed = holder;

          return Effect.succeed({
            allowed: true,
            limit: 60,
            policy: "free",
            remaining: 59,
            resetAfterSeconds: 60,
            windowSeconds: 60,
            withPaymentMethod: Option.none(),
          });
        },
        purge: Effect.succeed(0),
      })
    );

    const limits = yield* RequestLimits.pipe(
      Effect.provide(
        CountedRequestLimits.pipe(Layer.provide(Layer.merge(Fakes, limiter)))
      )
    );

    yield* limits.admit(principal);

    if (handed === undefined) {
      return yield* Effect.die("The limiter was not asked");
    }

    return { key: handed.key, workspaces: yield* handed.workspaces };
  });

describe("whose standing decides a credential's limit", () => {
  it.effect("an API key's workspace", () =>
    Effect.gen(function* key() {
      assert.deepStrictEqual(
        yield* holderOf(
          new ApiKeyPrincipal({
            apiKeyId: "synthetic-key",
            permissions: [],
            workspaceId: own,
          })
        ),
        { key: `workspace:${own}`, workspaces: [own] }
      );
    })
  );

  it.effect("a partner key's home workspace, one holder per partner", () =>
    Effect.gen(function* partner() {
      assert.deepStrictEqual(
        yield* holderOf(
          new PartnerKeyPrincipal({
            partnerId,
            partnerKeyId: PartnerKeyIdSchema.make(
              "0190f3a0-0000-7000-8000-0000000000c2"
            ),
            permissions: [],
            scopes: [],
          })
        ),
        { key: `partner:${partnerId}`, workspaces: [home] }
      );
    })
  );

  it.effect(
    "an application's bound workspace, or else every workspace of its user",
    () =>
      Effect.gen(function* oauth() {
        assert.deepStrictEqual(
          yield* holderOf(
            new UserPrincipal({
              impersonatedBy: Option.none(),
              oauth: Option.some({
                clientId: "synthetic-client",
                scopes: ["workspace:read"],
                workspaceId: Option.some(own),
              }),
              userId,
            })
          ),
          { key: `workspace:${own}`, workspaces: [own] }
        );

        assert.deepStrictEqual(
          yield* holderOf(
            new UserPrincipal({
              impersonatedBy: Option.none(),
              oauth: Option.some({
                clientId: "peal-cli",
                scopes: ["workspace:read"],
                workspaceId: Option.none(),
              }),
              userId,
            })
          ),
          { key: `user:${userId}`, workspaces: [own, other] }
        );
      })
  );
});
