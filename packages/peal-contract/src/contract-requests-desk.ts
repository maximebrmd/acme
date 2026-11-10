import { Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/http-api";

import { BillingNotEnabled } from "./billing-not-enabled.ts";
import { BillingUnavailable } from "./billing-unavailable.ts";
import { ContractRequestNotFound } from "./contract-request-not-found.ts";
import { ContractRequestSettled } from "./contract-request-settled.ts";
import {
  ContractRequestKindSchema,
  ContractRequestOutcomeSchema,
  ContractRequestStatusSchema,
} from "./contract-requests.ts";
import { StaffAccess } from "./staff-access.ts";
import { StaffReasonSchema } from "./staff.ts";

/** A request that waits for staff. */
export const OpenContractRequestSchema = Schema.Struct({
  // The contract as its sender wrote it, if they did.
  contract: Schema.NullOr(Schema.String),
  desiredOn: Schema.NullOr(Schema.DateTimeUtc),
  email: Schema.NullOr(Schema.String),
  id: Schema.String,
  kind: ContractRequestKindSchema,
  name: Schema.NullOr(Schema.String),
  receivedAt: Schema.DateTimeUtc,
  status: ContractRequestStatusSchema,
  // The account its address signs in to, if any.
  userId: Schema.NullOr(Schema.String),
}).annotate({ identifier: "OpenContractRequest" });

export type OpenContractRequest = typeof OpenContractRequestSchema.Type;

const requestParams = { requestId: Schema.String };

/**
 * The requests to cancel or withdraw that the form could not apply by
 * itself, for the people who run the server: those no contract was found
 * for, and those whose sender has not followed their link. Applying one
 * ties it to a workspace's contract, as of the moment it was received, and
 * tells its sender; each action is in the audit log. It answers 404 to
 * anyone but staff in their own session.
 */
export class ContractRequestsDeskApi extends HttpApiGroup.make(
  "contractRequestsDesk"
)
  .add(
    HttpApiEndpoint.get("list", "/contract-requests", {
      success: Schema.Array(OpenContractRequestSchema),
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "The requests that wait for staff, oldest first, with what their sender wrote to identify themselves and the contract.",
        summary: "List the requests that wait for staff",
      })
    )
  )
  .add(
    HttpApiEndpoint.post("apply", "/contract-requests/:requestId/apply", {
      error: [
        BillingNotEnabled,
        BillingUnavailable,
        ContractRequestNotFound,
        ContractRequestSettled,
      ],
      params: requestParams,
      payload: Schema.Struct({
        reason: StaffReasonSchema,
        workspaceId: Schema.String,
      }),
      success: ContractRequestOutcomeSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Applies the request to the workspace's contract, as of the moment it was received, once staff know its sender holds that contract. The action is recorded first; the sender is then told what became of it.",
        summary: "Apply a request to a workspace's contract",
      })
    )
  )
  .add(
    HttpApiEndpoint.post("close", "/contract-requests/:requestId/close", {
      error: [ContractRequestNotFound, ContractRequestSettled],
      params: requestParams,
      payload: Schema.Struct({ reason: StaffReasonSchema }),
      success: ContractRequestOutcomeSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Closes the request without applying it, as one sent twice or by someone who holds no contract. The action is recorded first. Its sender is not written to.",
        summary: "Close a request",
      })
    )
  )
  .middleware(StaffAccess)
  .prefix("/api/admin") {}
