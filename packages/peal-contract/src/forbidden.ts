import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";
import { PermissionSchema } from "./permission.ts";

/**
 * Why valid credentials were refused:
 *
 * - `missingScope`: the member may do this, but did not let this OAuth
 *   client: `scope` is the scope to ask them for.
 * - `missingPermission`: the member's role, or the API key, lacks
 *   `permission`.
 * - `personRequired`: only a person in their own session does this, never
 *   an API key, an OAuth client or staff acting as them.
 * - `wrongWorkspace`: the key or token belongs to another workspace.
 * - `suspended`: the account is suspended.
 * - `untrustedOrigin`: a browser sent the session's cookie from another
 *   site.
 */
export const ForbiddenReasonSchema = Schema.Literals([
  "missingScope",
  "missingPermission",
  "personRequired",
  "wrongWorkspace",
  "suspended",
  "untrustedOrigin",
]).annotate({ identifier: "ForbiddenReason" });

export type ForbiddenReason = typeof ForbiddenReasonSchema.Type;

/**
 * The credentials are valid, but do not allow this: a missing permission or
 * scope, a suspended account, an API key used outside its workspace, or a
 * cookie sent from another site. `reason` says which, and `message` how to
 * get what is missing.
 */
export class Forbidden extends Schema.TaggedError<Forbidden>()(
  "Forbidden",
  {
    ...errorEnvelope,
    // The permission the request takes, when one is missing.
    permission: Schema.optionalKey(PermissionSchema),
    reason: Schema.optionalKey(ForbiddenReasonSchema),
    // The OAuth scope that carries `permission`, when the client lacks it.
    scope: Schema.optionalKey(Schema.String),
  },
  {
    description:
      "The credentials are valid but do not allow this request. `reason` says why: the OAuth client was not given the scope the request takes (`missingScope`, with `scope` and `permission`: the user connects the client again and allows it), the member's role or the API key lacks a permission (`missingPermission`, with `permission`: an owner or an admin changes the role, or creates a key with it), only a person in their own session may do it (`personRequired`), the key or token belongs to another workspace (`wrongWorkspace`), the account is suspended (`suspended`), or a browser sent the cookie from another site (`untrustedOrigin`).",
    httpApiStatus: 403,
  }
) {}
