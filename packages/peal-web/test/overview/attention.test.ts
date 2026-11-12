import { describe, expect, it } from "@effect/vitest";
import type { WorkspaceOverview } from "peal-contract";

import { attentionOf, byAttention } from "#overview/attention.ts";

const calm: WorkspaceOverview = {
  channels: { connected: 3, off: 0, toReconnect: 0 },
  id: "5b1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e21",
  inbox: { unanswered: 0 },
  name: "Calm",
  overPlan: false,
  posts: {
    awaitingApproval: 0,
    failedLast7Days: 0,
    mayApprove: true,
    scheduledNext7Days: 4,
    unconfirmedLast7Days: 0,
  },
  refused: null,
  role: "owner",
  slug: "calm",
};

const busy: WorkspaceOverview = {
  ...calm,
  channels: { connected: 3, off: 1, toReconnect: 2 },
  id: "5b1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e22",
  inbox: { unanswered: 5 },
  name: "Busy",
  overPlan: true,
  posts: {
    awaitingApproval: 2,
    failedLast7Days: 1,
    mayApprove: false,
    scheduledNext7Days: 0,
    unconfirmedLast7Days: 3,
  },
  slug: "busy",
};

const refused: WorkspaceOverview = {
  ...calm,
  channels: null,
  id: "5b1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e23",
  inbox: null,
  name: "Refused",
  overPlan: null,
  posts: null,
  refused: "twoStepRequired",
  slug: "refused",
};

describe(attentionOf, () => {
  it("lists what needs attention, most pressing first, each with its page", () => {
    expect(attentionOf(busy)).toStrictEqual([
      { count: 1, kind: "overPlan", page: "billing" },
      {
        count: 1,
        kind: "failed",
        page: "posts?status=finished&outcome=failed",
      },
      {
        count: 3,
        kind: "unconfirmed",
        page: "posts?status=finished&outcome=unconfirmed",
      },
      { count: 2, kind: "awaitingApproval", page: "approvals" },
      { count: 2, kind: "toReconnect", page: "channels" },
      { count: 1, kind: "channelsOff", page: "channels" },
      { count: 5, kind: "unanswered", page: "inbox" },
    ]);
  });

  it("finds nothing in a calm workspace, nor in one that refuses the person", () => {
    expect(attentionOf(calm)).toStrictEqual([]);
    expect(attentionOf(refused)).toStrictEqual([]);
  });

  it("reads nothing into a section the role may not read", () => {
    expect(
      attentionOf({ ...busy, channels: null, inbox: null, posts: null })
    ).toStrictEqual([{ count: 1, kind: "overPlan", page: "billing" }]);
  });
});

describe(byAttention, () => {
  it("puts the workspaces with something to attend first, each group in its order", () => {
    const unknown = { id: "5b1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e24" };

    const overview = new Map([
      [calm.id, calm],
      [busy.id, busy],
      [refused.id, refused],
    ]);

    expect(
      byAttention([calm, unknown, refused, busy], overview).map(({ id }) => id)
    ).toStrictEqual([busy.id, calm.id, unknown.id, refused.id]);
  });
});
