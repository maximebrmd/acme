import { Effect, Layer } from "effect";

import { ImpersonationAudit } from "#staff/application/impersonation-audit.ts";
import { ImpersonationLog } from "#workspace/application/impersonation-log.ts";

/** What staff do while acting as someone, in the staff context's audit log. */
export const StaffImpersonationLog = Layer.effect(
  ImpersonationLog,
  Effect.service(ImpersonationAudit).pipe(
    Effect.map((audit) =>
      ImpersonationLog.of({
        changed: audit.changed,
        ended: audit.ended,
        stopped: audit.stopped,
      })
    )
  )
);
