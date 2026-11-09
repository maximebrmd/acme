import { Option, Result, Schema } from "effect";

import { UserIdSchema } from "#shared/domain/ids.ts";
import type { UserId } from "#shared/domain/ids.ts";

import { InboxAccessDenied } from "./inbox-access-denied.ts";

/**
 * Whoever reads a user's notices and preferences: the user, staff
 * impersonating them, or an OAuth client acting for them.
 */
export class InboxReader extends Schema.Class<InboxReader>(
  "acme-server/notifications/domain/InboxReader"
)({
  impersonated: Schema.Boolean,
  // The client acting for the user, if one is: the scopes the user agreed
  // to, and whether its token is bound to one workspace.
  oauth: Schema.Option(
    Schema.Struct({
      boundToWorkspace: Schema.Boolean,
      scopes: Schema.Array(Schema.String),
    })
  ),
  userId: UserIdSchema,
}) {}

/** Reading notices and preferences, or changing them. */
export type InboxAction = InboxAccessDenied["action"];

// The workspace scopes of OAuth clients, as the user agreed to them.
const scopesFor: Readonly<Record<InboxAction, readonly string[]>> = {
  change: ["workspace:write"],
  read: ["workspace:read", "workspace:write"],
};

/**
 * The user whose inbox the reader may act on. Notices span the user's
 * workspaces, so a client bound to one workspace may not read them. Marking
 * them read and choosing emails outlive an impersonation, so staff may only
 * read; a client changes them with `workspace:write`.
 */
export const authorizeInbox = (
  reader: InboxReader,
  action: InboxAction
): Result.Result<UserId, InboxAccessDenied> => {
  const clientAllowed = Option.match(reader.oauth, {
    onNone: () => true,
    onSome: ({ boundToWorkspace, scopes }) =>
      !boundToWorkspace &&
      scopesFor[action].some((scope) => scopes.includes(scope)),
  });

  const allowed =
    clientAllowed && !(action === "change" && reader.impersonated);

  return allowed
    ? Result.succeed(reader.userId)
    : Result.fail(new InboxAccessDenied({ action }));
};
