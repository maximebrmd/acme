import { DateTime, Effect, Layer } from "effect";

import { InvalidTenantCursor } from "#billing/application/invalid-tenant-cursor.ts";
import { NoPartnerAccount } from "#billing/application/no-partner-account.ts";
import { PartnerScopeMissing } from "#billing/application/partner-scope-missing.ts";
import { PartnerTenancy } from "#billing/application/ports/partner-tenancy.ts";
import type { TenancyAsked } from "#billing/application/ports/partner-tenancy.ts";
import { PartnerTenants } from "#workspace/application/partner-tenants.ts";
import type { TenancyRequest } from "#workspace/application/partner-tenants.ts";

const requestOf = ({ before, limit }: TenancyAsked): TenancyRequest => ({
  before,
  limit,
});

const refusals = {
  InvalidWorkspaceCursor: () => Effect.fail(new InvalidTenantCursor()),
  PartnerNotFound: () => Effect.fail(new NoPartnerAccount()),
};

/** PartnerTenancy, as the workspace context's PartnerTenants answers it. */
export const WorkspacePartnerTenancyLive = Layer.effect(
  PartnerTenancy,
  Effect.gen(function* WorkspacePartnerTenancyLive() {
    const tenants = yield* PartnerTenants;

    return PartnerTenancy.of({
      // The workspace context's days are calendar days, as `2026-11-10`.
      daysOf: (partnerId, { from, to }) =>
        tenants.daysOf(partnerId, from, to).pipe(
          Effect.map((days) =>
            days.map(({ channels, day, workspaces }) => ({
              channels,
              day: DateTime.makeUnsafe(`${day}T00:00:00Z`),
              workspaces,
            }))
          )
        ),
      forKey: (key, asked) =>
        tenants.forKey(key, requestOf(asked)).pipe(
          Effect.catchTags({
            ...refusals,
            MissingPartnerScope: ({ scope }) =>
              Effect.fail(new PartnerScopeMissing({ scope })),
          })
        ),
      forMember: (actor, asked) =>
        tenants
          .forMember(actor, requestOf(asked))
          .pipe(Effect.catchTags(refusals)),
    });
  })
);
