import { Schema } from "effect";

import { PermissionSchema } from "#shared/domain/access.ts";

/** A partner key never holds this permission: only people do this. */
export class PermissionNotGrantable extends Schema.TaggedError<PermissionNotGrantable>()(
  "PermissionNotGrantable",
  { permission: PermissionSchema }
) {}
