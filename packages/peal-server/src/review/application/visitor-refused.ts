import { Schema } from "effect";

/**
 * A visitor's write that was not taken: too many came from their address
 * or through the link lately (`tooManyRequests`), or the captcha's token is
 * missing or wrong (`captchaRequired`).
 */
export class VisitorRefused extends Schema.TaggedError<VisitorRefused>()(
  "VisitorRefused",
  { reason: Schema.Literals(["captchaRequired", "tooManyRequests"]) }
) {}
