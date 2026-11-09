import { Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/http-api";

/**
 * Whether signing up and asking for a password reset need a Cloudflare
 * Turnstile token, and the site key the widget is shown with. Clients send
 * the widget's token in the `x-captcha-response` header.
 */
export const CaptchaSchema = Schema.Struct({
  // Null when the server asks for no captcha.
  turnstileSiteKey: Schema.NullOr(Schema.String),
}).annotate({ identifier: "Captcha" });

export type Captcha = typeof CaptchaSchema.Type;

/** The captcha the sign-up and password reset forms show, for anyone. */
export class CaptchaApi extends HttpApiGroup.make("captcha").add(
  HttpApiEndpoint.get("get", "/api/captcha", {
    success: CaptchaSchema,
  }).annotateMerge(
    OpenApi.annotations({
      description:
        "Tells whether signing up and requesting a password reset need a Cloudflare Turnstile token, sent as the `x-captcha-response` header of Better Auth's requests, and the site key to show the widget with. Needs no credentials.",
      summary: "Get the captcha settings",
    })
  )
) {}
