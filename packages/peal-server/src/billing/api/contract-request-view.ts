import { Option } from "effect";
import type {
  ContractRequestOutcome,
  OpenContractRequest,
} from "peal-contract";

import type { ContractRequest } from "#billing/domain/contract-request.ts";

/** What became of a request, as the API answers it. */
export const outcomeView = (
  request: ContractRequest
): ContractRequestOutcome => ({
  effectiveAt: Option.getOrNull(request.effectiveAt),
  kind: request.kind,
  receivedAt: request.receivedAt,
  refunded: Option.getOrNull(request.refunded),
  refusal: Option.getOrNull(request.refusal),
  status: request.status,
});

/** A request that waits for staff, with what its sender wrote. */
export const openRequestView = (
  request: ContractRequest
): OpenContractRequest => ({
  contract: Option.getOrNull(request.contract),
  desiredOn: Option.getOrNull(request.desiredAt),
  email: Option.getOrNull(request.email),
  id: request.id,
  kind: request.kind,
  name: Option.getOrNull(request.name),
  receivedAt: request.receivedAt,
  status: request.status,
  userId: Option.getOrNull(request.userId),
});
