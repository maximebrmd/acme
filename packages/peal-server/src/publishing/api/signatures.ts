import { Effect, Option, Schema } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import {
  Api,
  CurrentMember,
  SignatureNameTaken,
  SignatureNotFound,
  TooManySignatures,
  UnknownChannels,
} from "peal-contract";
import type { SignatureDetails as DetailsInput } from "peal-contract";

import { Signatures } from "#publishing/application/signatures.ts";
import { SignatureIdSchema } from "#publishing/domain/signature-id.ts";
import { SignatureScopeSchema } from "#publishing/domain/signature.ts";
import type { SignatureDetails } from "#publishing/domain/signature.ts";
import { actorOf } from "#shared/api/actor.ts";
import { forbidden } from "#shared/api/forbidden.ts";

import { signatureView } from "./signature-view.ts";

const decodeSignatureId = Schema.decodeUnknownOption(SignatureIdSchema);

const decodeScope = Schema.decodeUnknownOption(SignatureScopeSchema);

const notFound = () => Effect.fail(new SignatureNotFound());

const nameTaken = () => Effect.fail(new SignatureNameTaken());

const unknownChannels = ({
  channelIds,
}: {
  readonly channelIds: readonly string[];
}) => Effect.fail(new UnknownChannels({ channelIds }));

/** The signature a path names, or SignatureNotFound. */
export const signatureIdFrom = (raw: string) =>
  Option.match(decodeSignatureId(raw), {
    onNone: notFound,
    onSome: Effect.succeed,
  });

/**
 * A signature as a request writes it, with its scope decoded: a channel
 * id that is not even of the right form names no channel of the workspace.
 */
export const signatureDetailsFrom = ({
  isDefault = false,
  name,
  scope = { _tag: "workspace" },
  text,
}: DetailsInput): Effect.Effect<SignatureDetails, UnknownChannels> =>
  Option.match(decodeScope(scope), {
    onNone: () =>
      Effect.fail(
        new UnknownChannels({
          channelIds: scope._tag === "channel" ? [scope.channelId] : [],
        })
      ),
    onSome: (decoded) =>
      Effect.succeed({ isDefault, name, scope: decoded, text }),
  });

// A failure of the server's own (the database, a bug) is a defect: 500.
export const SignaturesHandlers = HttpApiBuilder.group(
  Api,
  "signatures",
  Effect.fn(function* signaturesHandlers(handlers) {
    const signatures = yield* Signatures;

    return handlers.handleAll({
      create: ({ payload }) =>
        Effect.gen(function* create() {
          const actor = actorOf(yield* CurrentMember);
          const details = yield* signatureDetailsFrom(payload);

          return yield* signatures.create(actor, details).pipe(
            Effect.map(signatureView),
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
              SignatureNameTaken: nameTaken,
              TooManySignatures: ({ allowed }) =>
                Effect.fail(new TooManySignatures({ allowed })),
              UnknownChannels: unknownChannels,
            })
          );
        }),
      delete: ({ params }) =>
        Effect.gen(function* remove() {
          const actor = actorOf(yield* CurrentMember);
          const signatureId = yield* signatureIdFrom(params.signatureId);

          yield* signatures.remove(actor, signatureId).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
              SignatureNotFound: notFound,
            })
          );
        }),
      list: () =>
        Effect.gen(function* list() {
          const actor = actorOf(yield* CurrentMember);

          return yield* signatures.list(actor).pipe(
            Effect.map((all) => all.map(signatureView)),
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
            })
          );
        }),
      update: ({ params, payload }) =>
        Effect.gen(function* update() {
          const actor = actorOf(yield* CurrentMember);
          const signatureId = yield* signatureIdFrom(params.signatureId);
          const details = yield* signatureDetailsFrom(payload);

          return yield* signatures.update(actor, signatureId, details).pipe(
            Effect.map(signatureView),
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
              SignatureNameTaken: nameTaken,
              SignatureNotFound: notFound,
              UnknownChannels: unknownChannels,
            })
          );
        }),
    });
  })
);
