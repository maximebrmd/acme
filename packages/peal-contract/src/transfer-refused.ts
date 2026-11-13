import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** Why a workspace's billing cannot change hands. */
export const TransferRefusalSchema = Schema.Literals([
  "notPayer",
  "notAnOwner",
  "samePayer",
  "partnerWorkspace",
  "subscribed",
]).annotate({ identifier: "TransferRefusal" });

export type TransferRefusal = typeof TransferRefusalSchema.Type;

/** The workspace's billing was not offered, nor handed over. */
export class TransferRefused extends Schema.TaggedError<TransferRefused>()(
  "TransferRefused",
  { ...errorEnvelope, reason: TransferRefusalSchema },
  {
    description:
      "The workspace's billing was not offered, nor handed over: only its payer offers it (`notPayer`), to another owner of the workspace (`notAnOwner`) who does not already pay for it (`samePayer`); a partner's workspaces stay on the partner's account (`partnerWorkspace`); and a workspace that bills its account with a subscription Stripe may still charge is handed over once that subscription is cancelled, or another workspace is handed over instead (`subscribed`).",
    httpApiStatus: 409,
  }
) {}
