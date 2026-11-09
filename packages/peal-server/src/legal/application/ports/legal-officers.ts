import { Context } from "effect";
import type { Effect } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { UserId } from "#shared/domain/ids.ts";

/**
 * Who among staff may answer legal requests: those holding the legal role
 * too, which the workspace context's accounts tell, read fresh.
 */
export class LegalOfficers extends Context.Service<
  LegalOfficers,
  {
    readonly mayAnswer: (
      staffId: UserId
    ) => Effect.Effect<boolean, DatabaseError>;
  }
>()("peal-server/legal/application/LegalOfficers") {}
