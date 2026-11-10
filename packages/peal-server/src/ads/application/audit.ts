import { DateTime, Effect, Option } from "effect";

import type { AuditAction } from "#ads/domain/audit-action.ts";
import type { AdAccountId, BoostId } from "#ads/domain/ids.ts";
import { newId } from "#shared/application/ids.ts";
import type { ActorSubject } from "#shared/domain/access.ts";
import { Uuid7Schema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

import { BoostStore } from "./ports/boost-store.ts";

/** What a line of the audit trail says, before it is given an id and a time. */
export interface Audited {
  readonly accountId?: AdAccountId;
  readonly action: AuditAction;
  /** Amounts in minor units, by name. */
  readonly amounts?: Readonly<Record<string, number>>;
  readonly boostId?: BoostId;
  /** Who did it: left out for what Peal's jobs found. */
  readonly by?: ActorSubject;
  readonly currency?: string;
  readonly workspaceId: WorkspaceId;
}

/**
 * Writes a line of the audit trail, in the caller's transaction when there
 * is one: the fact and its record commit together.
 */
export const audit = Effect.fn("Ads.audit")(function* audit(entry: Audited) {
  const store = yield* BoostStore;

  yield* store.audit({
    accountId: Option.fromUndefinedOr(entry.accountId),
    action: entry.action,
    amounts: entry.amounts ?? {},
    at: yield* DateTime.now,
    boostId: Option.fromUndefinedOr(entry.boostId),
    by: Option.fromUndefinedOr(entry.by),
    currency: Option.fromUndefinedOr(entry.currency),
    id: yield* newId(Uuid7Schema),
    workspaceId: entry.workspaceId,
  });
});
