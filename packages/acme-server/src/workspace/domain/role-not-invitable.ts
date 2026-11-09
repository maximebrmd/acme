import { Schema } from "effect";

import { RoleSchema } from "./roles.ts";

/** Only owners invite people as owners. */
export class RoleNotInvitable extends Schema.TaggedError<RoleNotInvitable>()(
  "RoleNotInvitable",
  { role: RoleSchema }
) {}
