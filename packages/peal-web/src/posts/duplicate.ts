import type { Permission } from "peal-contract";

/** Whether a member may copy a post into a new draft, as the API asks. */
export const mayDuplicate = (permissions: readonly Permission[]): boolean =>
  permissions.includes("post:read") && permissions.includes("post:create");

/** Why a copy was not made, as the catalogue's `Posts.Duplicate.failed` names it. */
export type DuplicateFailure = "forbidden" | "notFound" | "other";

/** The reason behind the error a duplicate request failed with, by its tag. */
export const duplicateFailureOf = (
  tag: string | undefined
): DuplicateFailure => {
  if (tag === "Forbidden") {
    return "forbidden";
  }

  return tag === "PostNotFound" ? "notFound" : "other";
};

/** Where the copy opens: the composer, on the new draft. */
export const duplicateHref = (workspaceId: string, postId: string): string =>
  `/app/${workspaceId}/posts/${postId}`;
