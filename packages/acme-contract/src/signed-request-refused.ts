import { Schema } from "effect";

/** The request was not signed with the app's secret, or is malformed. */
export class SignedRequestRefused extends Schema.TaggedError<SignedRequestRefused>()(
  "SignedRequestRefused",
  {},
  {
    description:
      "The signed request does not match the app's secret, or cannot be read. Nothing was deleted.",
    httpApiStatus: 400,
  }
) {}
