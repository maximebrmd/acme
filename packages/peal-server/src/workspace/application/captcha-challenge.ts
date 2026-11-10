import { Context } from "effect";
import type { Effect, Option } from "effect";

/**
 * The captcha signing up and password resets need, if any: the Cloudflare
 * Turnstile site key clients show the widget with. Better Auth checks the
 * tokens of its own routes; `passes` checks one for a route of Peal's API
 * that takes requests without credentials.
 */
export class CaptchaChallenge extends Context.Service<
  CaptchaChallenge,
  {
    /**
     * Whether a request with this token may go on: always on a server
     * without Turnstile; with it, when Cloudflare says the token passes. A
     * check Cloudflare could not answer lets the request through, as the
     * functions behind it must stay reachable: the address limits remain.
     */
    readonly passes: (token: Option.Option<string>) => Effect.Effect<boolean>;
    readonly turnstileSiteKey: Option.Option<string>;
  }
>()("peal-server/workspace/application/CaptchaChallenge") {}
