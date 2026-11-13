import { Effect, Layer } from "effect";

import { AccountDeskAudit } from "#billing/application/ports/account-desk-audit.ts";
import { BillingAccountAudit } from "#staff/application/billing-account-audit.ts";

const auditActions = {
  detach: "detachBillingWorkspace",
  merge: "mergeBillingAccounts",
  requirePaymentMethod: "requirePaymentMethod",
  restoreFreeTier: "restoreFreeTier",
} as const;

/** What staff do to billing accounts, in the staff context's audit log. */
export const AuditedAccountDeskLive = Layer.effect(
  AccountDeskAudit,
  Effect.gen(function* AuditedAccountDeskLive() {
    const audit = yield* BillingAccountAudit;

    return AccountDeskAudit.of({
      handled: ({ action, ...entry }) =>
        audit.handled({
          ...entry,
          action: auditActions[action],
        }),
    });
  })
);
