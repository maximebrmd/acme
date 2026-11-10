import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { ContractRequestId } from "#billing/domain/contract-request.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";

/** What a staff member did with a request, and why. */
export interface HandledRequest {
  readonly action: "apply" | "close";
  readonly at: DateTime.Utc;
  /** Why, in the staff member's words. */
  readonly reason: string;
  readonly requestId: ContractRequestId;
  readonly staffId: UserId;
  /** The account the request's address signs in to, if any. */
  readonly userId: Option.Option<UserId>;
  /** The workspace whose contract it was applied to. */
  readonly workspaceId: Option.Option<WorkspaceId>;
}

/**
 * Where what staff do with requests is recorded, before it is done: the
 * staff context's audit log. Ids only, never what a request said.
 */
export class RequestReview extends Context.Service<
  RequestReview,
  {
    readonly handled: (
      handled: HandledRequest
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/billing/application/RequestReview") {}
