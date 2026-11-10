import { Schema } from "effect";

/** The address sent more requests than the server takes for now. */
export class TooManyContractRequests extends Schema.TaggedError<TooManyContractRequests>()(
  "TooManyContractRequests",
  {},
  {
    description:
      "The address sent too many requests to cancel or withdraw in the last hour. Try again later, or sign in and use the billing page.",
    httpApiStatus: 429,
  }
) {}
