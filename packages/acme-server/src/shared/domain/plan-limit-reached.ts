import { Schema } from "effect";

import { PlanLimitSchema } from "./plan-limit.ts";

/**
 * The workspace's plan allows no more of this: `allowed` are already there.
 * A larger plan, or removing some, makes room.
 */
export class PlanLimitReached extends Schema.TaggedError<PlanLimitReached>()(
  "PlanLimitReached",
  { allowed: Schema.Int, limit: PlanLimitSchema }
) {
  override get message(): string {
    return `The workspace's plan allows ${this.allowed} ${this.limit}`;
  }
}
