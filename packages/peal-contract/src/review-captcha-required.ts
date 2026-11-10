import { Schema } from "effect";

/** The server asks for a captcha before it takes this: send the widget's token in the x-captcha-response header. */
export class ReviewCaptchaRequired extends Schema.TaggedError<ReviewCaptchaRequired>()(
  "ReviewCaptchaRequired",
  {},
  {
    description:
      "The server asks for a captcha before it takes this: send the widget's token in the x-captcha-response header.",
    httpApiStatus: 403,
  }
) {}
