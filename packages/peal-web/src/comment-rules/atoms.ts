import { PealApi } from "#api/client.ts";

// The queries and mutations of a workspace's comment rules. A change
// passes `reactivityKeys: commentRulesChanged(workspaceId)`.

/** What refreshes a workspace's comment rules once a change lands. */
export const commentRulesChanged = (workspaceId: string) => [
  `comment-rules:${workspaceId}`,
];

/** The workspace's comment rules: a workspace keeps 100 going at most. */
export const workspaceCommentRules = (workspaceId: string) =>
  PealApi.query("inboxRules", "listCommentRules", {
    params: { workspaceId },
    query: { limit: 100 },
    reactivityKeys: commentRulesChanged(workspaceId),
  });

export const startCommentRule = PealApi.mutation(
  "inboxRules",
  "createCommentRule"
);

export const updateCommentRule = PealApi.mutation(
  "inboxRules",
  "updateCommentRule"
);

export const stopCommentRule = PealApi.mutation(
  "inboxRules",
  "deleteCommentRule"
);
