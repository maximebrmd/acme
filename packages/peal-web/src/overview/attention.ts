import type { WorkspaceOverview } from "peal-contract";

/** Something that needs attention in a workspace, with its count. */
export type AttentionKind =
  | "overPlan"
  | "failed"
  | "unconfirmed"
  | "awaitingApproval"
  | "toReconnect"
  | "channelsOff"
  | "unanswered";

export interface AttentionItem {
  readonly count: number;
  readonly kind: AttentionKind;
  /** The page that shows it, under the workspace's `/app/<id>`. */
  readonly page: string;
}

/**
 * What needs attention in a workspace, most pressing first, each with the
 * page that shows it: nothing where the person may not read a section, or
 * where the workspace refuses them. Failed and unconfirmed posts open the
 * posts list filtered on that outcome.
 */
export const attentionOf = (workspace: WorkspaceOverview): AttentionItem[] => {
  const { channels, inbox, overPlan, posts } = workspace;

  const items: (AttentionItem | false)[] = [
    overPlan === true && { count: 1, kind: "overPlan", page: "billing" },
    posts !== null &&
      posts.failedLast7Days > 0 && {
        count: posts.failedLast7Days,
        kind: "failed",
        page: "posts?status=finished&outcome=failed",
      },
    posts !== null &&
      posts.unconfirmedLast7Days > 0 && {
        count: posts.unconfirmedLast7Days,
        kind: "unconfirmed",
        page: "posts?status=finished&outcome=unconfirmed",
      },
    posts !== null &&
      posts.awaitingApproval > 0 && {
        count: posts.awaitingApproval,
        kind: "awaitingApproval",
        page: "approvals",
      },
    channels !== null &&
      channels.toReconnect > 0 && {
        count: channels.toReconnect,
        kind: "toReconnect",
        page: "channels",
      },
    channels !== null &&
      channels.off > 0 && {
        count: channels.off,
        kind: "channelsOff",
        page: "channels",
      },
    inbox !== null &&
      inbox.unanswered > 0 && {
        count: inbox.unanswered,
        kind: "unanswered",
        page: "inbox",
      },
  ];

  return items.filter((item) => item !== false);
};

/**
 * The workspaces in the order the home shows them: those with something to
 * attend first, then the others, each group in the order it came. A
 * workspace the overview did not answer for keeps its place among the
 * others.
 */
export const byAttention = <W extends { readonly id: string }>(
  workspaces: readonly W[],
  overview: ReadonlyMap<string, WorkspaceOverview>
): W[] => {
  const attends = (workspace: W) => {
    const found = overview.get(workspace.id);

    return found !== undefined && attentionOf(found).length > 0;
  };

  return [
    ...workspaces.filter(attends),
    ...workspaces.filter((workspace) => !attends(workspace)),
  ];
};
