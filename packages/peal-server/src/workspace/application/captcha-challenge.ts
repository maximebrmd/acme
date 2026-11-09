import { Context } from "effect";
import type { Option } from "effect";

/**
 * The captcha signing up and password resets need, if any: the Cloudflare
 * Turnstile site key clients show the widget with. Better Auth checks the
 * tokens.
 */
export class CaptchaChallenge extends Context.Service<
  CaptchaChallenge,
  { readonly turnstileSiteKey: Option.Option<string> }
>()("peal-server/workspace/application/CaptchaChallenge") {}
