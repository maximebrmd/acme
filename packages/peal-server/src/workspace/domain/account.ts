import { Schema } from "effect";

import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { LocaleSchema } from "#shared/domain/locale.ts";

import { BanSchema } from "./ban.ts";

/** A workspace a user belongs to, and the role they hold there. */
export const WorkspaceMembershipSchema = Schema.Struct({
  id: WorkspaceIdSchema,
  name: Schema.String,
  role: Schema.String,
  slug: Schema.String,
});

export type WorkspaceMembership = typeof WorkspaceMembershipSchema.Type;

/** A user's account, and every workspace they belong to. */
export class Account extends Schema.Class<Account>(
  "peal-server/workspace/domain/Account"
)({
  ban: Schema.Option(BanSchema),
  email: Schema.String,
  emailVerified: Schema.Boolean,
  id: UserIdSchema,
  image: Schema.Option(Schema.String),
  locale: LocaleSchema,
  name: Schema.String,
  // Whether two-step verification is on for the account.
  twoStepEnabled: Schema.Boolean,
  workspaces: Schema.Array(WorkspaceMembershipSchema),
}) {}
