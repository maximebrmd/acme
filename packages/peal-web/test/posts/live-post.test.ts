import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option } from "effect";
import type { LivePostChange, PostTarget } from "peal-contract";

import {
  isRemovedEverywhere,
  isRemoving,
  liveStateOf,
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
  code: string | null = null
): LivePostChange => ({
  code,
  finishedAt: status === "pending" ? null : at,
  id,
  kind: "unpublish",
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
