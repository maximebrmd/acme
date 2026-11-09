import { Effect, Layer } from "effect";

import { LegalOfficers } from "#legal/application/ports/legal-officers.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { StaffStanding } from "#workspace/application/staff-standing.ts";

/** The staff the workspace context says hold the legal role, read fresh. */
export const StaffLegalOfficers = Layer.effect(
  LegalOfficers,
  Effect.gen(function* StaffLegalOfficers() {
    const standing = yield* StaffStanding;

    return LegalOfficers.of({
      mayAnswer: (staffId) =>
        standing.answersLegalRequests(staffId).pipe(
          Effect.mapError((cause) => new DatabaseError({ cause })),
          Effect.withSpan("LegalOfficers.mayAnswer")
        ),
    });
  })
);
