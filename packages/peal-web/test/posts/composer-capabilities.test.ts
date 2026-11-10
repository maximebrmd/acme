import { describe, expect, it } from "@effect/vitest";
import type { Permission, Post, PostStatus } from "peal-contract";

import { capabilitiesOf } from "#posts/composer-capabilities.ts";

const author = "5b1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e2f";

const colleague = "0e9d8c7b-6a5f-4e3d-8c2b-1a0f9e8d7c6b";

const contributor: readonly Permission[] = [
  "post:read",
  "post:create",
  "post:update",
];

const editor: readonly Permission[] = [
  ...contributor,
  "post:delete",
  "post:schedule",
];

const postIn = (
  status: PostStatus,
  authorId: string | null = author
): Post => ({
  authorId,
  content: { media: [], overrides: [], text: "A synthetic post" },
  id: "00000000-0000-7000-8000-000000000001",
  outcome: null,
  schedule: null,
  status,
  targets: [],
});

describe(capabilitiesOf, () => {
  it("lets a contributor discard their own draft, not a colleague's", () => {
    const draft = postIn("draft");

    expect(
      capabilitiesOf({
        permissions: contributor,
        post: draft,
        saved: true,
        userId: author,
      }).canDiscard
    ).toBeTruthy();
    expect(
      capabilitiesOf({
        permissions: contributor,
        post: draft,
        saved: true,
        userId: colleague,
      }).canDiscard
    ).toBeFalsy();
    expect(
      capabilitiesOf({
        permissions: editor,
        post: draft,
        saved: true,
        userId: colleague,
      }).canDiscard
    ).toBeTruthy();
  });

  it("discards a new post only once it was saved", () => {
    expect(
      capabilitiesOf({
        permissions: contributor,
        post: undefined,
        saved: false,
        userId: author,
      }).canDiscard
    ).toBeFalsy();
    expect(
      capabilitiesOf({
        permissions: contributor,
        post: undefined,
        saved: true,
        userId: author,
      }).canDiscard
    ).toBeTruthy();
  });

  it("takes a scheduled post back to draft for those who schedule", () => {
    const scheduled = postIn("scheduled");

    expect(
      capabilitiesOf({
        permissions: editor,
        post: scheduled,
        saved: true,
        userId: author,
      })
    ).toMatchObject({
      canCancel: true,
      canDiscard: false,
      canUnschedule: true,
      canWrite: false,
    });
    expect(
      capabilitiesOf({
        permissions: contributor,
        post: scheduled,
        saved: true,
        userId: author,
      }).canUnschedule
    ).toBeFalsy();
    expect(
      capabilitiesOf({
        permissions: editor,
        post: postIn("draft"),
        saved: true,
        userId: author,
      })
    ).toMatchObject({ canCancel: false, canUnschedule: false });
  });
});

const approver: readonly Permission[] = [...editor, "post:approve"];

const of = (
  permissions: readonly Permission[],
  post: Post | undefined,
  approvalPolicy: "always" | "contributorsAndApplications" | "never"
) =>
  capabilitiesOf({
    approvalPolicy,
    permissions,
    post,
    saved: post !== undefined,
    userId: author,
  });

describe("capabilitiesOf, where posts wait for an approval", () => {
  it("lets a contributor ask, where the workspace asks for approvals", () => {
    expect(of(contributor, postIn("draft"), "never").canSchedule).toBeFalsy();

    for (const policy of ["contributorsAndApplications", "always"] as const) {
      const { canSchedule, willWait } = of(
        contributor,
        postIn("draft"),
        policy
      );

      expect([canSchedule, willWait]).toStrictEqual([true, true]);
    }
  });

  it("tells an editor whether what they schedule waits", () => {
    expect(
      of(editor, postIn("draft"), "contributorsAndApplications").willWait
    ).toBeFalsy();
    expect(of(editor, postIn("draft"), "always").willWait).toBeTruthy();
    expect(of(editor, postIn("draft"), "never").willWait).toBeFalsy();
  });

  it("keeps a post that waits as it is, to move, take back or cancel", () => {
    const waiting = of(contributor, postIn("awaitingApproval"), "always");

    expect(waiting).toMatchObject({
      canCancel: true,
      canReschedule: true,
      canSchedule: false,
      canUnschedule: true,
      canWrite: false,
      status: "awaitingApproval",
    });
  });

  it("leaves a scheduled post to those who may schedule", () => {
    expect(of(contributor, postIn("scheduled"), "always")).toMatchObject({
      canCancel: false,
      canReschedule: false,
      canUnschedule: false,
    });
    expect(of(approver, postIn("scheduled"), "always")).toMatchObject({
      canCancel: true,
      canReschedule: true,
      canUnschedule: true,
    });
  });

  it("lets those who may approve decide on a post that waits, not staff acting as them", () => {
    expect(
      of(approver, postIn("awaitingApproval"), "always").canDecide
    ).toBeTruthy();
    expect(
      of(editor, postIn("awaitingApproval"), "always").canDecide
    ).toBeFalsy();
    expect(of(approver, postIn("scheduled"), "always").canDecide).toBeFalsy();
  });
});
