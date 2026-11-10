import { Schema } from "effect";

/** The request was already applied, refused or closed. */
export class ContractRequestSettled extends Schema.TaggedError<ContractRequestSettled>()(
  "ContractRequestSettled",
  { status: Schema.String },
  {
    description:
      "The request was already applied, refused or closed: nothing more is done with it.",
    httpApiStatus: 409,
  }
) {}
