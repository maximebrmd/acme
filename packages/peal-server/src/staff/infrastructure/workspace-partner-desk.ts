import { Effect, Layer, Option } from "effect";

import { PartnerDesk } from "#staff/application/ports/partner-desk.ts";
import { PartnerAccounts } from "#workspace/application/partner-accounts.ts";
import { PartnerOwnership } from "#workspace/application/partner-ownership.ts";

/** PartnerDesk, on the workspace context's partner accounts. */
export const WorkspacePartnerDesk = Layer.effect(
  PartnerDesk,
  Effect.gen(function* WorkspacePartnerDesk() {
    const accounts = yield* PartnerAccounts;
    const ownership = yield* PartnerOwnership;

    return PartnerDesk.of({
      grant: (workspaceId) =>
        accounts.grant(workspaceId).pipe(
          Effect.as(true),
          Effect.catchTag("WorkspaceNotEligible", () => Effect.succeed(false))
        ),
      positionOf: (workspaceId) =>
        Effect.all({
          account: ownership.accountOf(workspaceId),
          owner: ownership.ownerOf(workspaceId),
        }).pipe(
          Effect.map(({ account, owner }) => ({
            account: account.pipe(
              Option.map(({ partner, workspaces }) => ({
                createdAt: partner.createdAt,
                id: partner.id,
                name: partner.name,
                workspaces,
              }))
            ),
            owner: owner.pipe(
              Option.map(({ externalId, homeWorkspaceId, partnerId }) => ({
                externalId,
                homeWorkspaceId,
                partnerId,
              }))
            ),
          }))
        ),
    });
  })
);
