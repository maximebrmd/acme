import { Schema } from "effect";

import { ContractRequestStatusSchema } from "./contract-request.ts";

/** The request was already applied, refused or closed. */
export class ContractRequestSettled extends Schema.TaggedError<ContractRequestSettled>()(
  "ContractRequestSettled",
  { status: ContractRequestStatusSchema }
) {}
