import { Effect, Layer, Option } from "effect";

import { MemberAddresses } from "#billing/application/ports/member-addresses.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { WorkspaceContacts } from "#workspace/application/workspace-contacts.ts";

/**
 * A billing manager's address, from the workspace context's contacts: the
 * members whose role manages billing, which a banned user is not among.
 */
export const ContextMemberAddressesLive = Layer.effect(
  MemberAddresses,
  Effect.gen(function* ContextMemberAddressesLive() {
    const contacts = yield* WorkspaceContacts;

    return MemberAddresses.of({
      of: (userId, workspaceId) =>
        contacts.withPermission(workspaceId, "billing:manage").pipe(
          Effect.map(({ contacts: managers }) =>
            Option.fromUndefinedOr(
              managers.find((manager) => manager.userId === userId)
            ).pipe(Option.map(({ email }) => email))
          ),
          Effect.mapError(({ cause }) => new DatabaseError({ cause })),
          Effect.withSpan("MemberAddresses.of")
        ),
    });
  })
);
