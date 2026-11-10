import { Option } from "effect";
import type {
  CustomerWorkspace as CustomerWorkspaceView,
  CustomerWorkspacePage as CustomerWorkspacePageView,
  Partner as PartnerView,
  PartnerKey as PartnerKeyView,
  PartnerUsage as PartnerUsageView,
} from "peal-contract";

import type {
  CountedWorkspace,
  CountedWorkspacePage,
  PartnerUsage,
} from "#workspace/application/partner-workspaces.ts";
import type { PartnerKey } from "#workspace/domain/partner-key.ts";
import type { Partner } from "#workspace/domain/partner.ts";

// What the API and the MCP tools answer of partner accounts.

export const partnerView = (partner: Partner): PartnerView => ({
  createdAt: partner.createdAt,
  id: partner.id,
  logoUrl: Option.getOrNull(partner.logoUrl),
  name: partner.name,
  returnOrigins: partner.returnOrigins,
  workspaceId: partner.workspaceId,
});

export const partnerUsageView = (usage: PartnerUsage): PartnerUsageView => ({
  channels: usage.channels,
  days: usage.days,
  workspaces: usage.workspaces,
});

export const partnerKeyView = (key: PartnerKey): PartnerKeyView => ({
  createdAt: key.createdAt,
  expiresAt: Option.getOrNull(key.expiresAt),
  id: key.id,
  name: key.name,
  permissions: key.permissions,
  scopes: key.scopes,
  start: key.start,
});

export const customerWorkspaceView = ({
  channels,
  workspace,
}: CountedWorkspace): CustomerWorkspaceView => ({
  channels,
  createdAt: workspace.createdAt,
  externalId: Option.getOrNull(workspace.externalId),
  id: workspace.id,
  name: workspace.name,
});

export const customerWorkspacePageView = (
  page: CountedWorkspacePage
): CustomerWorkspacePageView => ({
  next: Option.getOrNull(page.next),
  total: page.total,
  workspaces: page.workspaces.map(customerWorkspaceView),
});
