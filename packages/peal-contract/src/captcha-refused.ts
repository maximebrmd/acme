import { Schema } from "effect";

/** The request needs a Turnstile token, and had none that passes. */
export class CaptchaRefused extends Schema.TaggedError<CaptchaRefused>()(
  "CaptchaRefused",
  {},
  {
    description:
      "The server asks for a Cloudflare Turnstile token in the `x-captcha-response` header, and the request had none, or one that did not pass. Nothing was recorded.",
    httpApiStatus: 403,
  }
) {}
