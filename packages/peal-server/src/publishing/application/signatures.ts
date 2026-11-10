import { Context, DateTime, Effect, Layer, Option } from "effect";

import { SignatureIdSchema } from "#publishing/domain/signature-id.ts";
import type { SignatureId } from "#publishing/domain/signature-id.ts";
import {
  createSignature,
  editSignature,
  maxSignaturesPerWorkspace,
  scopeKeyOf,
} from "#publishing/domain/signature.ts";
import type {
  Signature,
  SignatureDetails,
} from "#publishing/domain/signature.ts";
import { tagKeyOf } from "#publishing/domain/tag.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { newId } from "#shared/application/ids.ts";
import type { Ids } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";

import { channelsFor } from "./post-references.ts";
import { SignatureNameTaken } from "./signature-name-taken.ts";
import { SignatureNotFound } from "./signature-not-found.ts";
import { SignatureStore } from "./signature-store.ts";
import { TooManySignatures } from "./too-many-signatures.ts";
import type { UnknownChannels } from "./unknown-channels.ts";
import type { WorkspaceChannels } from "./workspace-channels.ts";

type WriteFailure =
  | DatabaseError
  | MissingPermission
  | SignatureNameTaken
  | UnknownChannels;

// Fails when another signature of the workspace has the name.
const nameFree = (
  kept: readonly Signature[],
  name: string,
  except: Option.Option<SignatureId>
) =>
  kept.some(
    (signature) =>
      tagKeyOf(signature.name) === tagKeyOf(name) &&
      !Option.contains(except, signature.id)
  )
    ? Effect.fail(new SignatureNameTaken({ name }))
    : Effect.void;

/**
 * A workspace's signatures: the blocks of text it ends its posts with.
 *
 * Reading them needs post:read; writing one post:update, as editing a post
 * does, and channel:read when it is meant for one channel, which must be
 * the workspace's. A workspace has one signature per name, whatever its
 * case, and one default per scope: marking a signature as the default
 * unmarks the one that was, for the same scope.
 */
export class Signatures extends Context.Service<
  Signatures,
  {
    /** The workspace's signatures, oldest first. */
    readonly list: (
      actor: Actor
    ) => Effect.Effect<readonly Signature[], DatabaseError | MissingPermission>;
    readonly create: (
      actor: Actor,
      details: SignatureDetails
    ) => Effect.Effect<Signature, TooManySignatures | WriteFailure>;
    readonly update: (
      actor: Actor,
      signatureId: SignatureId,
      details: SignatureDetails
    ) => Effect.Effect<Signature, SignatureNotFound | WriteFailure>;
    readonly remove: (
      actor: Actor,
      signatureId: SignatureId
    ) => Effect.Effect<
      void,
      DatabaseError | MissingPermission | SignatureNotFound
    >;
  }
>()("peal-server/publishing/application/Signatures") {
  static readonly layer = Layer.effect(
    Signatures,
    Effect.gen(function* SignaturesLive() {
      const store = yield* SignatureStore;
      const { transaction } = yield* TransactionRunner;
      const ports = yield* Effect.context<Ids | WorkspaceChannels>();

      const withPorts = Effect.provideContext(ports);

      // Whoever may write signatures, and a scope that is the workspace's.
      const checked = Effect.fn("Signatures.checked")(function* checked(
        actor: Actor,
        { scope }: SignatureDetails
      ) {
        yield* Effect.fromResult(authorize(actor, "post:update"));

        if (scope._tag === "channel") {
          yield* channelsFor(actor, [scope.channelId]).pipe(withPorts);
        }
      });

      // A scope has one default: the others of the new default's scope
      // are defaults no longer.
      const soleDefault = (kept: readonly Signature[], chosen: Signature) =>
        chosen.isDefault
          ? Effect.forEach(
              kept.filter(
                (signature) =>
                  signature.id !== chosen.id &&
                  signature.isDefault &&
                  scopeKeyOf(signature.scope) === scopeKeyOf(chosen.scope)
              ),
              (signature) =>
                store.update(
                  editSignature(signature, {
                    isDefault: false,
                    name: signature.name,
                    scope: signature.scope,
                    text: signature.text,
                  })
                ),
              { discard: true }
            )
          : Effect.void;

      const list = Effect.fn("Signatures.list")(function* list(actor: Actor) {
        yield* Effect.fromResult(authorize(actor, "post:read"));

        return yield* store.list(actor.workspaceId);
      });

      const create = Effect.fn("Signatures.create")(function* create(
        actor: Actor,
        details: SignatureDetails
      ) {
        yield* checked(actor, details);

        const signatureId = yield* newId(SignatureIdSchema).pipe(withPorts);
        const now = yield* DateTime.now;

        return yield* transaction(
          Effect.gen(function* add() {
            yield* store.claim(actor.workspaceId);

            const kept = yield* store.list(actor.workspaceId);

            if (kept.length >= maxSignaturesPerWorkspace) {
              return yield* new TooManySignatures({
                allowed: maxSignaturesPerWorkspace,
              });
            }

            yield* nameFree(kept, details.name, Option.none());

            const signature = createSignature(
              signatureId,
              actor.workspaceId,
              details,
              now
            );

            yield* soleDefault(kept, signature);
            yield* store.insert(signature);

            return signature;
          })
        );
      });

      const update = Effect.fn("Signatures.update")(function* update(
        actor: Actor,
        signatureId: SignatureId,
        details: SignatureDetails
      ) {
        yield* checked(actor, details);

        return yield* transaction(
          Effect.gen(function* edit() {
            yield* store.claim(actor.workspaceId);

            const kept = yield* store.list(actor.workspaceId);
            const current = kept.find(({ id }) => id === signatureId);

            if (current === undefined) {
              return yield* new SignatureNotFound({ signature: signatureId });
            }

            yield* nameFree(kept, details.name, Option.some(signatureId));

            const signature = editSignature(current, details);

            yield* soleDefault(kept, signature);
            yield* store.update(signature);

            return signature;
          })
        );
      });

      const remove = Effect.fn("Signatures.remove")(function* remove(
        actor: Actor,
        signatureId: SignatureId
      ) {
        yield* Effect.fromResult(authorize(actor, "post:update"));

        return yield* transaction(
          Effect.gen(function* drop() {
            yield* store.claim(actor.workspaceId);

            const kept = yield* store.list(actor.workspaceId);

            if (!kept.some(({ id }) => id === signatureId)) {
              return yield* new SignatureNotFound({ signature: signatureId });
            }

            return yield* store.remove(actor.workspaceId, signatureId);
          })
        );
      });

      return Signatures.of({ create, list, remove, update });
    })
  );
}
