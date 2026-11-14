import type { Reply } from "#engagement/domain/reply.ts";
import type { MeterClaim } from "#shared/application/metered-usage.ts";

/**
 * The outbound message a reply claimed when it was journalled: what it
 * gives back when it ends as never sent.
 */
export const messageOf = (reply: Reply): MeterClaim => ({
  at: reply.createdAt,
  meter: "outboundMessages",
  units: 1,
  workspaceId: reply.workspaceId,
});
