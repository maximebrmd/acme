import { Effect, Layer } from "effect";

import { ReaderStanding } from "#notifications/application/reader-standing.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { AccountStanding } from "#workspace/application/account-standing.ts";

/** Users' standing as the workspace context, which holds accounts, has it. */
export const WorkspaceReaderStanding = Layer.effect(
  ReaderStanding,
  Effect.gen(function* WorkspaceReaderStanding() {
    const accounts = yield* AccountStanding;

    return ReaderStanding.of({
      isActive: (userId) =>
        accounts
          .isActive(userId)
          .pipe(Effect.mapError((cause) => new DatabaseError({ cause }))),
    });
  })
);
