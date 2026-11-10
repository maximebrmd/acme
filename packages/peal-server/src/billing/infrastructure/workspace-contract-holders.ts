import { Effect, Layer, Option } from "effect";

import { ContractHolders } from "#billing/application/ports/contract-holders.ts";
import type { ContractHolder } from "#billing/application/ports/contract-holders.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { AccountLookup } from "#workspace/application/account-lookup.ts";

/**
 * Who manages which workspaces' billing, from the workspace context: the
 * workspaces where the account's role allows billing:manage.
 */
export const WorkspaceContractHoldersLive = Layer.effect(
  ContractHolders,
  Effect.gen(function* WorkspaceContractHoldersLive() {
    const accounts = yield* AccountLookup;

    const held = Effect.fnUntraced(function* held(
      found: ReturnType<typeof accounts.byEmail>
    ) {
      const account = yield* found.pipe(
        Effect.mapError((cause) => new DatabaseError({ cause }))
      );

      return account.pipe(
        Option.map(({ userId, workspaces }): ContractHolder => ({
          userId,
          workspaces,
        }))
      );
    });

    return ContractHolders.of({
      byEmail: (email) => held(accounts.byEmail(email, "billing:manage")),
      byId: (userId) => held(accounts.byId(userId, "billing:manage")),
    });
  })
);
