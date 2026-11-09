import { Context } from "effect";
import type { Effect } from "effect";

import type { UserId } from "#shared/domain/ids.ts";

import type { AuthUnavailable } from "./auth-unavailable.ts";

/** The sessions staff open to act as someone else. */
export class ImpersonationSessions extends Context.Service<
  ImpersonationSessions,
  {
    /**
     * Ends every session the staff member acts as someone in, and answers
     * with the accounts they acted as; none once they are ended.
     */
    readonly endBy: (
      staffId: UserId
    ) => Effect.Effect<readonly UserId[], AuthUnavailable>;
  }
>()("peal-server/workspace/application/ImpersonationSessions") {}
