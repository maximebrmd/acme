import { Schema } from "effect";

import { PermissionSchema } from "#shared/domain/access.ts";

/**
 * A key never holds this permission: a partner key none of what only
 * people do, an API key none of what only a person in their own session
 * uses.
 */
export class PermissionNotGrantable extends Schema.TaggedError<PermissionNotGrantable>()(
  "PermissionNotGrantable",
  { permission: PermissionSchema }
) {}
