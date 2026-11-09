import { Effect, Layer, Option } from "effect";

import { DisclosureReview } from "#legal/application/ports/disclosure-review.ts";
import { LegalDisclosureAudit } from "#staff/application/legal-disclosure-audit.ts";

/** Each answer, in the staff context's audit log. */
export const AuditDisclosureReview = Layer.effect(
  DisclosureReview,
  Effect.gen(function* AuditDisclosureReview() {
    const audit = yield* LegalDisclosureAudit;

    return DisclosureReview.of({
      answered: ({ subject, ...request }) =>
        audit.disclosed({
          ...request,
          userId:
            "userId" in subject ? Option.some(subject.userId) : Option.none(),
          workspaceId:
            "workspaceId" in subject
              ? Option.some(subject.workspaceId)
              : Option.none(),
        }),
    });
  })
);
