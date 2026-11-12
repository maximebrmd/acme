import { Config, Effect, Layer } from "effect";

import { SignUpSettings } from "#workspace/application/sign-up-settings.ts";
import { SignUpModeSchema } from "#workspace/domain/sign-up-mode.ts";

/**
 * `PEAL_SIGN_UP`: `open` (the default) lets anyone make an account;
 * `invitation` only an address with a pending invitation, and the first
 * account of a server that has none. Any other value stops the server.
 * Read when the server starts.
 */
export const signUpModeConfig = Config.schema(
  SignUpModeSchema,
  "PEAL_SIGN_UP"
).pipe(Config.withDefault("open" as const));

export const SignUpSettingsLive = Layer.effect(
  SignUpSettings,
  Effect.gen(function* SignUpSettingsLive() {
    return SignUpSettings.of({ mode: yield* signUpModeConfig });
  })
);
