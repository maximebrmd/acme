import { readFile } from "node:fs/promises";

import { Config, Effect, Layer, Option, Schema } from "effect";

import { stripeSettingsConfig } from "#shared/infrastructure/stripe-settings.ts";
import { PrivacyDeclaration } from "#workspace/application/privacy-declaration.ts";
import {
  OperatorDeclarationSchema,
  undeclared,
} from "#workspace/domain/operator-declaration.ts";
import { PrivacyDeclarationUnreadable } from "#workspace/infrastructure/privacy-declaration-unreadable.ts";

const decode = Schema.decodeUnknownEffect(
  Schema.fromJsonString(OperatorDeclarationSchema)
);

/**
 * The operator's declaration, from the JSON file
 * `PEAL_PRIVACY_DECLARATION_FILE` names, read when the server starts: a
 * file that is missing or does not decode stops it there. Unset, nothing
 * is declared, and each user's export says so rather than guess. Whether
 * the server bills comes from Stripe's settings.
 */
export const PrivacyDeclarationLive = Layer.effect(
  PrivacyDeclaration,
  Effect.gen(function* PrivacyDeclarationLive() {
    const file = yield* Config.option(
      Config.NonEmptyString("PEAL_PRIVACY_DECLARATION_FILE")
    );

    const stripe = yield* stripeSettingsConfig;

    const declared = yield* Option.match(file, {
      onNone: () => Effect.succeed(undeclared),
      onSome: (path) =>
        Effect.tryPromise(async () => await readFile(path, "utf-8")).pipe(
          Effect.flatMap(decode),
          Effect.mapError(
            (cause) => new PrivacyDeclarationUnreadable({ cause, file: path })
          )
        ),
    });

    return PrivacyDeclaration.of({ bills: Option.isSome(stripe), declared });
  })
);
