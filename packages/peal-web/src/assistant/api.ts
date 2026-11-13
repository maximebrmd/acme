import { PealApi } from "#api/client.ts";

// The writing assistant's status and suggestions. A request can change the
// count of requests left however it ends, so the composer refreshes the
// status after each one.

/**
 * Whether the assistant writes for the workspace, who writes, and the
 * workspace's requests left today.
 */
export const assistantStatus = (workspaceId: string) =>
  PealApi.query("assistant", "status", {
    params: { workspaceId },
    // The workspace's own providers change who writes and who makes images.
    reactivityKeys: [
      `image-provider:${workspaceId}`,
      `text-provider:${workspaceId}`,
    ],
  });

export const suggestChange = PealApi.mutation("assistant", "suggest");

/**
 * Makes an image into the workspace's media library; send it with the
 * media list's reactivity key, so the library shows the new image.
 */
export const generateImage = PealApi.mutation("assistant", "generateImage");
