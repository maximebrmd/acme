import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option } from "effect";
import type { LivePostChange, PostTarget } from "peal-contract";

import {
  editStateOf,
  isRemovedEverywhere,
  isRemoving,
  liveStateOf,
  partTextOn,
} from "#posts/live-post.ts";

const at = DateTime.makeUnsafe("2026-06-15T08:00:00Z");

const target = (fields: Partial<PostTarget> = {}): PostTarget => ({
  channelId: "c1",
  editedAt: null,
  failureReason: null,
  id: "t1",
  options: null,
  parts: { count: 1, live: [] },
  permalink: "https://social.example/@peal/1",
  publishedAt: at,
  removedAt: null,
  round: 1,
  status: "published",
  unconfirmedReason: null,
  ...fields,
});

const change = (
  id: string,
  status: LivePostChange["status"],
  code: string | null = null,
  kind: LivePostChange["kind"] = "unpublish"
): LivePostChange => ({
  code,
  finishedAt: status === "pending" ? null : at,
  id,
  kind,
  partsLeft: status === "done" ? 0 : 1,
  postId: "p1",
  requestedAt: at,
  status,
  targetId: "t1",
});

const deletes = Option.some({ edit: false, unpublish: true });

describe("where a channel of a live post stands", () => {
  it("offers removal where the platform lets Peal delete", () => {
    expect(liveStateOf(target(), [], deletes)).toStrictEqual({
      _tag: "offered",
    });
  });

  it("says why not where it does not", () => {
    expect(
      liveStateOf(
        target(),
        [],
        Option.some({
          edit: false,
          unpublish: false,
          unpublishBlockedBy: "permission",
        })
      )
    ).toStrictEqual({ _tag: "blocked", by: "permission" });
  });

  it("follows a removal: pending, failed, then removed", () => {
    expect(
      liveStateOf(target(), [change("2", "pending")], deletes)
    ).toStrictEqual({ _tag: "removing" });
    expect(
      liveStateOf(
        target(),
        [change("1", "pending"), change("2", "failed", "unavailable")],
        deletes
      )
    ).toStrictEqual({ _tag: "failed", code: "unavailable" });
    expect(
      liveStateOf(target({ removedAt: at }), [change("2", "done")], deletes)
    ).toStrictEqual({ _tag: "removed" });
  });

  it("offers nothing on a channel the post is not live on", () => {
    expect(
      liveStateOf(target({ status: "failed" }), [], deletes)
    ).toStrictEqual({ _tag: "none" });
    expect(isRemoving([change("1", "done")])).toBeFalsy();
  });
});

const post = (targets: readonly PostTarget[]) => ({ targets });

describe("a post removed everywhere", () => {
  it("is one removed from every channel it went live on", () => {
    expect(
      isRemovedEverywhere(
        post([target({ removedAt: at }), target({ status: "failed" })])
      )
    ).toBeTruthy();
    expect(
      isRemovedEverywhere(post([target({ removedAt: at }), target()]))
    ).toBeFalsy();
    expect(
      isRemovedEverywhere(post([target({ status: "failed" })]))
    ).toBeFalsy();
  });
});

const edits = Option.some({ edit: true, unpublish: true });

describe("where an edit of a channel of a live post stands", () => {
  it("offers an edit where the platform lets Peal edit", () => {
    expect(editStateOf(target(), [], edits)).toStrictEqual({
      _tag: "offered",
    });
    expect(
      editStateOf(
        target(),
        [],
        Option.some({
          edit: false,
          editBlockedBy: "unverified",
          unpublish: true,
        })
      )
    ).toStrictEqual({ _tag: "blocked", by: "unverified" });
  });

  it("follows an edit: pending, failed, then offered again", () => {
    expect(
      editStateOf(target(), [change("2", "pending", null, "edit")], edits)
    ).toStrictEqual({ _tag: "editing" });
    expect(
      editStateOf(target(), [change("2", "failed", "postGone", "edit")], edits)
    ).toStrictEqual({ _tag: "failed", code: "postGone" });
    expect(
      editStateOf(target(), [change("2", "done", null, "edit")], edits)
    ).toStrictEqual({ _tag: "offered" });
  });

  it("waits while any change is pending, and offers nothing once removed", () => {
    expect(
      editStateOf(target(), [change("2", "pending")], edits)
    ).toStrictEqual({ _tag: "busy" });
    expect(editStateOf(target({ removedAt: at }), [], edits)).toStrictEqual({
      _tag: "none",
    });
    expect(editStateOf(target({ status: "failed" }), [], edits)).toStrictEqual({
      _tag: "none",
    });
  });

  it("keeps the removal's own state apart from an edit's", () => {
    expect(
      liveStateOf(target(), [change("2", "pending", null, "edit")], deletes)
    ).toStrictEqual({ _tag: "editing" });
    // A failed edit leaves removal offered.
    expect(
      liveStateOf(target(), [change("2", "failed", "x", "edit")], deletes)
    ).toStrictEqual({ _tag: "offered" });
  });
});

describe("a part's text on a channel", () => {
  const content = {
    followUps: [
      {
        delaySeconds: 0,
        media: [],
        overrides: [{ channelId: "c1", text: "Second, there" }],
        text: "Second",
      },
    ],
    media: [],
    overrides: [],
    text: "First",
  };

  it("is its override there, or its own", () => {
    expect(partTextOn(content, 0, "c1")).toBe("First");
    expect(partTextOn(content, 1, "c1")).toBe("Second, there");
    expect(partTextOn(content, 1, "c2")).toBe("Second");
    expect(partTextOn(content, 2, "c1")).toBe("");
  });
});
