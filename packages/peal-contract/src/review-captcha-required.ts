import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The server asks for a captcha before it takes this: send the widget's token in the x-captcha-response header. */
export class ReviewCaptchaRequired extends Schema.TaggedError<ReviewCaptchaRequired>()(
  "ReviewCaptchaRequired",
  { ...errorEnvelope },
  {
    description:
      "The server asks for a captcha before it takes this: send the widget's token in the x-captcha-response header.",
    httpApiStatus: 403,
  }
) {}
