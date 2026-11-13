import {
  Context,
  DateTime,
  Duration,
  Effect,
  Layer,
  Option,
  Redacted,
  Schema,
} from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import { newId } from "#shared/application/ids.ts";
import type { Ids } from "#shared/application/ids.ts";
import type { Actor, Permission } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";
import { PartnerKeyIdSchema } from "#workspace/domain/partner-id.ts";
import { PartnerKeyPrincipal } from "#workspace/domain/partner-key-principal.ts";
import {
  distinctScopes,
  grantableToPartnerKey,
  PartnerKey,
  partnerKeyPrefix,
} from "#workspace/domain/partner-key.ts";
import type { PartnerScope } from "#workspace/domain/partner-key.ts";
import type { PermissionNotGrantable } from "#workspace/domain/permission-not-grantable.ts";
import { inPerson } from "#workspace/domain/person-required.ts";
import type { PersonRequired } from "#workspace/domain/person-required.ts";

import { PartnerKeyNotFound } from "./partner-key-not-found.ts";
import { PartnerKeyTokens } from "./partner-key-tokens.ts";
import { PartnerNotFound } from "./partner-not-found.ts";
import { PartnerStore } from "./partner-store.ts";

const decodeKeyId = Schema.decodeUnknownOption(PartnerKeyIdSchema);

/** What a member asks of a new partner key. */
export interface NewPartnerKey {
  readonly expiresInDays: Option.Option<number>;
  readonly name: string;
  readonly permissions: readonly Permission[];
  readonly scopes: readonly PartnerScope[];
}

/** A new key: shown once, here. */
export interface CreatedPartnerKey {
  readonly key: Redacted.Redacted;
  readonly partnerKey: PartnerKey;
}

/**
 * A partner's keys, which its home workspace's people manage, and the
 * check of a key a request sends.
 *
 * | Use case | Needs                                |
 * | -------- | ------------------------------------ |
 * | list     | partner:read                         |
 * | create   | partner:manage, the member in person |
 * | revoke   | partner:manage                       |
 *
 * A key is created by a person, never by a key or an application, so one
 * leaked credential cannot mint others that outlive it; anyone who manages
 * the account may revoke one, a key of the workspace included, as revoking
 * only ever takes access away.
 */
export class PartnerKeys extends Context.Service<
  PartnerKeys,
  {
    readonly list: (
      actor: Actor
    ) => Effect.Effect<
      readonly PartnerKey[],
      DatabaseError | MissingPermission | PartnerNotFound
    >;
    readonly create: (
      actor: Actor,
      key: NewPartnerKey
    ) => Effect.Effect<
      CreatedPartnerKey,
      | DatabaseError
      | MissingPermission
      | PartnerNotFound
      | PermissionNotGrantable
      | PersonRequired
    >;
    readonly revoke: (
      actor: Actor,
      partnerKeyId: string
    ) => Effect.Effect<
      void,
      DatabaseError | MissingPermission | PartnerKeyNotFound | PartnerNotFound
    >;
    /**
     * Whose key a request sent, if it is a partner's, not expired, of an
     * account that still exists.
     */
    readonly verify: (
      token: Redacted.Redacted
    ) => Effect.Effect<Option.Option<PartnerKeyPrincipal>, DatabaseError>;
  }
>()("peal-server/workspace/application/PartnerKeys") {
  static readonly layer = Layer.effect(
    PartnerKeys,
    Effect.gen(function* PartnerKeysLive() {
      const partners = yield* PartnerStore;
      const tokens = yield* PartnerKeyTokens;
      const ports = yield* Effect.context<Ids>();

      const partnerOf = (actor: Actor) =>
        partners.ofWorkspace(actor.workspaceId).pipe(
          Effect.flatMap(
            Option.match({
              onNone: () => Effect.fail(new PartnerNotFound()),
              onSome: Effect.succeed,
            })
          )
        );

      const list = Effect.fn("PartnerKeys.list")(function* list(actor: Actor) {
        yield* Effect.fromResult(authorize(actor, "partner:read"));

        const partner = yield* partnerOf(actor);

        return yield* partners.keys(partner.id);
      });

      const create = Effect.fn("PartnerKeys.create")(function* create(
        actor: Actor,
        key: NewPartnerKey
      ) {
        yield* Effect.fromResult(authorize(actor, "partner:manage"));
        const userId = yield* Effect.fromResult(inPerson(actor));

        const permissions = yield* Effect.fromResult(
          grantableToPartnerKey(key.permissions)
        );

        const partner = yield* partnerOf(actor);
        const now = yield* DateTime.now;
        const issued = yield* tokens.issue;

        const partnerKey = new PartnerKey({
          createdAt: now,
          expiresAt: key.expiresInDays.pipe(
            Option.map((days) => DateTime.addDuration(now, Duration.days(days)))
          ),
          id: yield* newId(PartnerKeyIdSchema),
          name: key.name,
          partnerId: partner.id,
          permissions,
          scopes: distinctScopes(key.scopes),
          start: issued.start,
        });

        yield* partners.addKey(partnerKey, issued.digest, userId);

        const created: CreatedPartnerKey = { key: issued.token, partnerKey };

        return created;
      }, Effect.provideContext(ports));

      const revoke = Effect.fn("PartnerKeys.revoke")(function* revoke(
        actor: Actor,
        partnerKeyId: string
      ) {
        yield* Effect.fromResult(authorize(actor, "partner:manage"));

        const partner = yield* partnerOf(actor);
        const id = decodeKeyId(partnerKeyId);

        const removed = Option.isSome(id)
          ? yield* partners.removeKey(partner.id, id.value)
          : false;

        yield* removed
          ? Effect.void
          : Effect.fail(new PartnerKeyNotFound({ partnerKeyId }));
      });

      const verify = Effect.fn("PartnerKeys.verify")(function* verify(
        token: Redacted.Redacted
      ) {
        if (!Redacted.value(token).startsWith(partnerKeyPrefix)) {
          return Option.none<PartnerKeyPrincipal>();
        }

        const key = yield* partners.keyByDigest(yield* tokens.digestOf(token));
        const now = yield* DateTime.now;

        return key.pipe(
          Option.filter(({ expiresAt }) =>
            Option.match(expiresAt, {
              onNone: () => true,
              onSome: (at) => DateTime.isLessThan(now, at),
            })
          ),
          Option.map(
            (valid) =>
              new PartnerKeyPrincipal({
                partnerId: valid.partnerId,
                partnerKeyId: valid.id,
                permissions: valid.permissions,
                scopes: valid.scopes,
              })
          )
        );
      });

      return PartnerKeys.of({ create, list, revoke, verify });
    })
  );
}
