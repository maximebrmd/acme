import { Schema } from "effect";

import { PermissionSchema } from "./access.ts";

/** The actor may not do this in the workspace. */
export class MissingPermission extends Schema.TaggedError<MissingPermission>()(
  "MissingPermission",
  { permission: PermissionSchema }
) {}
