import { Schema } from "effect";

import { PlanLimitSchema } from "./plan-limit.ts";

/**
 * The workspace's plan allows no more of this: it holds `used`, would need
 * room for `needed`, and its plan allows `allowed`. A larger plan, or
 * removing some, makes room.
 */
export class PlanLimitReached extends Schema.TaggedError<PlanLimitReached>()(
  "PlanLimitReached",
  {
    allowed: Schema.Int,
    limit: PlanLimitSchema,
    // What the workspace would hold had this been let through.
    needed: Schema.Int,
    // What the workspace holds now, counted as the limit counts it.
    used: Schema.Int,
  }
) {
  override get message(): string {
    return `The workspace's plan allows ${this.allowed} ${this.limit}, and it has ${this.used}`;
  }
}
