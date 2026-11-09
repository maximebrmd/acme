import { Context } from "effect";

import type { Member } from "./principal.ts";

/**
 * Provided by the WorkspaceAccess middleware to the endpoints of a
 * workspace: the caller, as a member of the workspace in the path.
 */
export class CurrentMember extends Context.Service<CurrentMember, Member>()(
  "peal-contract/CurrentMember"
) {}
