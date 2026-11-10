import { Effect } from "effect";
import { HttpApiBuilder, HttpApiError } from "effect/http-api";
import { Api, CurrentStaff } from "peal-contract";

import { LegalRequests } from "#legal/application/legal-requests.ts";
import { UserIdSchema } from "#shared/domain/ids.ts";

// Staff without the legal role find nothing there either.
const refusals = {
  DatabaseError: Effect.die,
  NotLegalOfficer: () => Effect.fail(new HttpApiError.NotFound()),
};

const currentOfficer = CurrentStaff.pipe(
  Effect.map(({ userId }) => UserIdSchema.make(userId))
);

/**
 * The legal requests endpoints, for staff (StaffAccess) holding the legal
 * role: other staff get 404 too.
 */
export const LegalHandlers = HttpApiBuilder.group(
  Api,
  "legal",
  Effect.fn(function* legalHandlers(handlers) {
    const requests = yield* LegalRequests;

    return handlers.handleAll({
      answer: ({ payload }) =>
        Effect.gen(function* answer() {
          const answered = yield* requests
            .answer({
              authority: payload.authority,
              covers: payload.covers,
              legalBasis: payload.legalBasis,
              reference: payload.reference,
              since: payload.since ?? null,
              staffId: yield* currentOfficer,
              subject: payload.subject,
              until: payload.until ?? null,
            })
            .pipe(Effect.catchTags(refusals));

          return {
            at: answered.at,
            connections:
              answered.connections?.map((connection) => ({
                access: connection.access,
                apiKeyId: connection.apiKeyId,
                at: connection.at,
                ipAddress: connection.ipAddress,
                protocol: connection.protocol,
                userId: connection.userId,
                workspaceId: connection.workspaceId,
              })) ?? null,
            held: answered.held,
            id: answered.id,
          };
        }),
      answered: ({ query }) =>
        Effect.gen(function* answered() {
          return yield* requests
            .answered(yield* currentOfficer, query.page ?? 1)
            .pipe(Effect.catchTags(refusals));
        }),
      standing: () =>
        Effect.gen(function* standing() {
          yield* requests
            .ensureOfficer(yield* currentOfficer)
            .pipe(Effect.catchTags(refusals));
        }),
    });
  })
);
