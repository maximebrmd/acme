import { Schema } from "effect";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";

import { PartnerIdSchema } from "./partner-id.ts";

export const maxExternalIdLength = 255;

/**
 * A partner's own id for one of its customers, which it gives a workspace
 * so it never keeps a table mapping its ids to Peal's: written as given,
 * spaces around it aside, and unique among the partner's workspaces.
 */
export const ExternalIdSchema = Schema.Trim.check(
  Schema.isBetweenLength(1, maxExternalIdLength),
  Schema.isPattern(/^[^\p{Cc}]*$/u)
);

export const maxWorkspaceNameLength = 120;

/** A workspace's name, as a partner gives it. */
export const WorkspaceNameSchema = Schema.Trim.check(
  Schema.isBetweenLength(1, maxWorkspaceNameLength),
  Schema.isPattern(/^[^\p{Cc}]*$/u)
);

/**
 * A workspace a partner owns: one of its customers. It has no members:
 * the partner's keys act in it, and its customer connects their accounts
 * through hosted links, without a Peal account.
 */
export class CustomerWorkspace extends Schema.Class<CustomerWorkspace>(
  "peal-server/workspace/domain/CustomerWorkspace"
)({
  createdAt: Schema.DateTimeUtc,
  externalId: Schema.Option(Schema.NonEmptyString),
  id: WorkspaceIdSchema,
  name: Schema.NonEmptyString,
  partnerId: PartnerIdSchema,
}) {}
