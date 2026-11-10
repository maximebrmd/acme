import { PealApi } from "#api/client.ts";

// The cancel and withdraw functions, for anyone: a request from the form,
// and the link emailed to its address. Signed-in members who manage
// billing use the billing mutations (`#billing/api.ts`), applied at once.

export const sendContractRequest = PealApi.mutation("contractRequests", "send");

export const previewContractRequest = PealApi.mutation(
  "contractRequests",
  "preview"
);

export const confirmContractRequest = PealApi.mutation(
  "contractRequests",
  "confirm"
);
