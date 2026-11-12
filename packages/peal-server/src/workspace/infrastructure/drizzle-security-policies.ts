import { and, eq, inArray } from "drizzle-orm";
import { DateTime, Effect, Layer } from "effect";

import { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";
import {
  noPolicy,
  SecurityPolicies,
} from "#workspace/application/security-policies.ts";

import { securityPolicies } from "./schema.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

/** Security policies in `workspace.security_policies`, one row a workspace. */
export const SecurityPoliciesLive = Layer.effect(
  SecurityPolicies,
  Effect.gen(function* SecurityPoliciesLive() {
    const db = yield* Drizzle;

    const get = Effect.fn("SecurityPolicies.get")(function* get(
      workspaceId: WorkspaceId
    ) {
      const [row] = yield* db
        .select({ twoStepRequired: securityPolicies.twoStepRequired })
        .from(securityPolicies)
        .where(eq(securityPolicies.workspaceId, workspaceId))
        .limit(1)
        .pipe(Effect.mapError(failed));

      return row ?? noPolicy;
    });

    const requiredAmong = Effect.fn("SecurityPolicies.requiredAmong")(
      function* requiredAmong(workspaceIds: readonly WorkspaceId[]) {
        if (workspaceIds.length === 0) {
          return new Set<WorkspaceId>();
        }

        const rows = yield* db
          .select({ workspaceId: securityPolicies.workspaceId })
          .from(securityPolicies)
          .where(
            and(
              inArray(securityPolicies.workspaceId, [...workspaceIds]),
              eq(securityPolicies.twoStepRequired, true)
            )
          )
          .pipe(Effect.mapError(failed));

        const required = new Set<string>(
          rows.map(({ workspaceId }) => workspaceId)
        );

        return new Set(workspaceIds.filter((id) => required.has(id)));
      }
    );

    const set = Effect.fn("SecurityPolicies.set")(function* set(
      workspaceId: WorkspaceId,
      { twoStepRequired }: { readonly twoStepRequired: boolean },
      at: DateTime.Utc
    ) {
      const updatedAt = DateTime.toDateUtc(at);

      yield* db
        .insert(securityPolicies)
        .values({ twoStepRequired, updatedAt, workspaceId })
        .onConflictDoUpdate({
          set: { twoStepRequired, updatedAt },
          target: securityPolicies.workspaceId,
        })
        .pipe(Effect.mapError(failed));
    });

    return SecurityPolicies.of({ get, requiredAmong, set });
  })
);
