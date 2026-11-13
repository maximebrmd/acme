import { Schema } from "effect";

/** Why a workspace's billing cannot change hands. */
export const TransferRefusalSchema = Schema.Literals([
  // Only the workspace's payer offers it.
  "notPayer",
  // It goes only to another owner of the workspace.
  "notAnOwner",
  // The one it would go to already pays for it.
  "samePayer",
  // A partner's workspaces stay on the partner's account.
  "partnerWorkspace",
  // It carries a subscription that may still bill: cancel it first, or
  // hand over another workspace.
  "subscribed",
]);

export type TransferRefusal = typeof TransferRefusalSchema.Type;

/** A workspace's billing was not handed over, nor offered. */
export class TransferRefused extends Schema.TaggedError<TransferRefused>()(
  "TransferRefused",
  { reason: TransferRefusalSchema }
) {}
