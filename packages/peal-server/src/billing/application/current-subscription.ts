import { Effect } from "effect";

import { entitlementsOf } from "#billing/domain/entitlements.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

import { Subscriptions } from "./ports/subscriptions.ts";

/** The subscription that gives the workspace its plan now, if any. */
export const currentSubscription = (workspaceId: WorkspaceId) =>
  Subscriptions.use((subscriptions) =>
    subscriptions.ofWorkspace(workspaceId)
  ).pipe(Effect.map((held) => entitlementsOf(held).subscription));
