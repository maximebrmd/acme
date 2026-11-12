import { Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/http-api";

/**
 * Who may make an account on the server: anyone (`open`), or only an
 * address a workspace invited (`invitation`), and the first account of a
 * server that has none.
 */
export const SignUpModeSchema = Schema.Literals([
  "open",
  "invitation",
]).annotate({ identifier: "SignUpMode" });

export type SignUpMode = typeof SignUpModeSchema.Type;

/**
 * The header a sign-up names its invitation in, on a server where accounts
 * are made by invitation: the id its emailed or copied link carries.
 */
export const signUpInvitationHeader = "x-peal-invitation";

/**
 * Whether signing up and asking for a password reset need a Cloudflare
 * Turnstile token, and the site key the widget is shown with. Clients send
 * the widget's token in the `x-captcha-response` header. It also says who
 * may sign up.
 */
export const CaptchaSchema = Schema.Struct({
  // Who may sign up now; a server that leaves it out lets anyone.
  signUp: Schema.optionalKey(SignUpModeSchema),
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
        "Tells whether signing up and requesting a password reset need a Cloudflare Turnstile token, sent as the `x-captcha-response` header of Better Auth's requests, and the site key to show the widget with; and who may sign up (`signUp`): anyone (`open`), or only an address a workspace invited and the first account (`invitation`), where a sign-up names its invitation's id in the `x-peal-invitation` header and must give the address it went to, and Better Auth refuses any other with 403 `SIGN_UP_BY_INVITATION`. A server by invitation that has no account yet answers `open`: its first account may be made. Needs no credentials.",
      summary: "Get the captcha settings",
    })
  )
) {}
