import { Effect } from "effect";
import { HttpApiBuilder, HttpApiError } from "effect/http-api";
import { Api, CurrentStaff } from "peal-contract";

import { LegalRequests } from "#legal/application/legal-requests.ts";
import { UserIdSchema } from "#shared/domain/ids.ts";

/**
 * The legal requests endpoint, for staff (StaffAccess) holding the legal
 * role: other staff get 404 too.
 */
export const LegalHandlers = HttpApiBuilder.group(
  Api,
  "legal",
  Effect.fn(function* legalHandlers(handlers) {
    const requests = yield* LegalRequests;

    return handlers.handle("answer", ({ payload }) =>
      Effect.gen(function* answer() {
        const { userId } = yield* CurrentStaff;

        const answered = yield* requests
          .answer({
            authority: payload.authority,
            reference: payload.reference,
            staffId: UserIdSchema.make(userId),
            subject: payload.subject,
          })
          .pipe(
            // Staff without the legal role find nothing there either.
            Effect.catchTags({
              DatabaseError: Effect.die,
              // Staff without the legal role find nothing there either.
              NotLegalOfficer: () => Effect.fail(new HttpApiError.NotFound()),
            })
          );

        return {
          at: answered.at,
          connections: answered.connections.map((connection) => ({
            access: connection.access,
            apiKeyId: connection.apiKeyId,
            at: connection.at,
            ipAddress: connection.ipAddress,
            protocol: connection.protocol,
            userId: connection.userId,
            workspaceId: connection.workspaceId,
          })),
          held: answered.held.map((account) => ({
            accountCreatedAt: account.accountCreatedAt,
            closedAt: account.closedAt,
            email: account.email,
            name: account.name,
            signInMethods: account.signInMethods,
            stripeCustomerIds: account.stripeCustomerIds,
            userId: account.userId,
          })),
          id: answered.id,
        };
      })
    );
  })
);
