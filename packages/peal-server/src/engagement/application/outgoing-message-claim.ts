import type { OutgoingMessage } from "#engagement/domain/outgoing-message.ts";
import type { MeterClaim } from "#shared/application/metered-usage.ts";

/**
 * The outbound message a message sent from Peal claimed when it was
 * journalled: what it gives back when it ends as never sent.
 */
export const claimOf = (message: OutgoingMessage): MeterClaim => ({
  at: message.createdAt,
  meter: "outboundMessages",
  units: 1,
  workspaceId: message.workspaceId,
});
