import { Context, Layer } from "effect";

import type { SignUpMode } from "#workspace/domain/sign-up-mode.ts";

/** Who may make an account on this server, as its settings say. */
export class SignUpSettings extends Context.Service<
  SignUpSettings,
  { readonly mode: SignUpMode }
>()("peal-server/workspace/application/SignUpSettings") {
  /** For tests: a server in this mode. */
  static readonly layerTest = (mode: SignUpMode) =>
    Layer.succeed(SignUpSettings, SignUpSettings.of({ mode }));
}
