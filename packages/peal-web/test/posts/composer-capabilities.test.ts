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
  createdVia: null,
  id: "00000000-0000-7000-8000-000000000001",
  outcome: null,
  schedule: null,
  scheduledBy: null,
  scheduledVia: null,
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
