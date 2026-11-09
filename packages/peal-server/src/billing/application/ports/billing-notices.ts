import { Context } from "effect";
import type { Effect } from "effect";

import type { BillingNotice } from "#billing/domain/billing-notice.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/**
 * Tells the members who manage a workspace's billing, in the app and by
 * email, once per key.
 */
export class BillingNotices extends Context.Service<
  BillingNotices,
  {
    readonly tell: (request: {
      readonly key: string;
      readonly notice: BillingNotice;
      readonly workspaceId: WorkspaceId;
    }) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/billing/application/BillingNotices") {}
