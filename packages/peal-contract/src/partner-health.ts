import { Schema } from "effect";

import {
  OverviewChannelsSchema,
  OverviewInboxSchema,
  OverviewPostsSchema,
} from "./overview.ts";

/**
 * What needs attention in one of a partner's customers' workspaces, in the
 * figures and words of the overview across a person's workspaces. A
 * section is null where the credential may not read it (a key without
 * `channel:read`, `post:read` or `engagement:read`), which is not the
 * same as nothing to attend, which answers zeros.
 */
export const CustomerHealthSchema = Schema.Struct({
  channels: Schema.NullOr(OverviewChannelsSchema),
  // The partner's own id for its customer, when it gave one.
  externalId: Schema.NullOr(Schema.String),
  id: Schema.String,
  inbox: Schema.NullOr(OverviewInboxSchema),
  name: Schema.String,
  posts: Schema.NullOr(OverviewPostsSchema),
}).annotate({ identifier: "CustomerHealth" });

export type CustomerHealth = typeof CustomerHealthSchema.Type;

/**
 * The partner account as a whole: its workspaces share one plan and one
 * channel count.
 */
export const PartnerHealthAccountSchema = Schema.Struct({
  // Whether its workspaces schedule and publish nothing, as they hold
  // more channels together than the plan allows; null on a server that
  // does not bill.
  overPlan: Schema.NullOr(Schema.Boolean),
}).annotate({ identifier: "PartnerHealthAccount" });

export type PartnerHealthAccount = typeof PartnerHealthAccountSchema.Type;

/** A page of a partner's customers, each with what needs attention. */
export const PartnerHealthSchema = Schema.Struct({
  // The account as a whole, on the first page only; null on the others.
  account: Schema.NullOr(PartnerHealthAccountSchema),
  // What to pass as `before` for the next page; null on the last one.
  next: Schema.NullOr(Schema.String),
  // How many workspaces the partner owns.
  total: Schema.Int,
  workspaces: Schema.Array(CustomerHealthSchema),
}).annotate({ identifier: "PartnerHealth" });

export type PartnerHealth = typeof PartnerHealthSchema.Type;
