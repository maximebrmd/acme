import { Effect, Option } from "effect";
import { CurrentMember } from "peal-contract";
import type { Permission } from "peal-contract";

import { ToolRefused } from "#app/mcp/tool-refused.ts";
import { missingScope } from "#workspace/api/missing-scope.ts";

/** Fails the tool with a message the user can act on. */
export const refuse = (message: string) =>
  Effect.fail(new ToolRefused({ message }));

// What each scope lets a client do, as the consent page says it.
const scopeGrants = {
  "workspace:publish": "schedule and publish posts",
  "workspace:read": "read the workspace",
  "workspace:write": "write drafts and change the workspace",
} as const;

/**
 * The connection may not do this, and why: the user did not give the client
 * the scope it takes, which they grant by connecting it again, or their
 * role in the workspace does not allow it, which an owner or admin changes.
 */
export const notAllowed =
  (doing: string) =>
  ({ permission }: { readonly permission: Permission }) =>
    CurrentMember.pipe(
      Effect.flatMap((member) =>
        refuse(
          Option.match(missingScope(member, permission), {
            onNone: () =>
              `This connection may not ${doing} in this workspace: the user's role does not allow it (it takes the permission ${permission}). An owner or admin of the workspace can change their role, in the web app's settings.`,
            onSome: (scope) =>
              `This connection may not ${doing} in this workspace: the user did not give this client the scope ${scope} (${scopeGrants[scope]}). To grant it, the user connects this client to Peal again and allows it there; a connection keeps the scopes it was given until then.`,
          })
        )
      )
    );
