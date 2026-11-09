import { AcmeApi } from "#api/client.ts";

// The writing assistant's status and suggestions. A request can change the
// count of requests left however it ends, so the composer refreshes the
// status after each one.

/** Whether the server has a language model, and the workspace's requests left today. */
export const assistantStatus = (workspaceId: string) =>
  AcmeApi.query("assistant", "status", { params: { workspaceId } });

export const suggestChange = AcmeApi.mutation("assistant", "suggest");
