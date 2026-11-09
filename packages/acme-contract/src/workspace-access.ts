import { HttpApiMiddleware } from "effect/http-api";

import type { CurrentMember } from "./current-member.ts";
import type { CurrentPrincipal } from "./current-principal.ts";
import { Forbidden } from "./forbidden.ts";
import { WorkspaceNotFound } from "./workspace-not-found.ts";

/**
 * The caller as a member of the workspace in the path (`:workspaceId`). Put
 * it on workspace groups before Authentication, which runs first:
 * `.middleware(WorkspaceAccess).middleware(Authentication)`.
 */
export class WorkspaceAccess extends HttpApiMiddleware.Service<
  WorkspaceAccess,
  { provides: CurrentMember; requires: CurrentPrincipal }
>()("acme-contract/WorkspaceAccess", {
  error: [Forbidden, WorkspaceNotFound],
}) {}
