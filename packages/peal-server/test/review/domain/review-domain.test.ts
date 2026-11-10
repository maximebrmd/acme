import { describe, expect, it } from "@effect/vitest";
import { DateTime, Duration, Option, Result } from "effect";

import { ApprovalNotPending } from "#review/domain/approval-not-pending.ts";
import {
  isApplication,
  maySubmit,
  needsApproval,
} from "#review/domain/approval-policy.ts";
import {
  ApprovalRequest,
  approve,
  covers,
  requestChanges,
  withdraw,
} from "#review/domain/approval-request.ts";
import { locate, quotes } from "#review/domain/comment-anchor.ts";
import {
  commentText,
  maxCommentLength,
  visitorName,
} from "#review/domain/plain-text.ts";
import { ReviewComment, setResolved } from "#review/domain/review-comment.ts";
import {
  ApprovalRequestIdSchema,
  ReviewCommentIdSchema,
  ReviewLinkIdSchema,
} from "#review/domain/review-ids.ts";
import {
  allows,
  expiryOf,
  ReviewLink,
  revoke,
  standingOf,
} from "#review/domain/review-link.ts";
import { cutoffsAt } from "#review/domain/review-retention.ts";
import type { Reviewer } from "#review/domain/reviewer.ts";
import { Actor } from "#shared/domain/access.ts";
import {
  PostIdSchema,
  UserIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";
import { actorIn, apiKeyIn } from "#test/publishing/support.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

const utc = (iso: string): DateTime.Utc => DateTime.makeUnsafe(iso);

const now = utc("2026-06-15T07:00:00Z");

const workspaceId = WorkspaceIdSchema.make(
  "5b1c5f7e-3d2a-4c1b-9e8f-000000000001"
);

const userId = UserIdSchema.make("5b1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e2f");

const postId = PostIdSchema.make("00000000-0000-7000-8000-000000000001");

const linkId = ReviewLinkIdSchema.make("00000000-0000-7000-8000-000000000002");

const editor = actorIn(workspaceId);

const contributor = actorIn(workspaceId, permissionsFor("contributor"));

const viewer = actorIn(workspaceId, permissionsFor("viewer"));

const throughClient = new Actor({
  permissions: permissionsFor("editor"),
  subject: {
    _tag: "user",
    clientId: "peal-cli",
    impersonatedBy: Option.none(),
    userId,
  },
  workspaceId,
});

const impersonated = new Actor({
  permissions: permissionsFor("contributor"),
  subject: { _tag: "user", impersonatedBy: Option.some(userId), userId },
  workspaceId,
});

describe("the approval policy", () => {
  it("lets nobody wait when it is never", () => {
    for (const actor of [editor, contributor, apiKeyIn(workspaceId)]) {
      expect(needsApproval("never", actor)).toBeFalsy();
    }

    expect(maySubmit("never", contributor)).toBeFalsy();
    expect(maySubmit("never", editor)).toBeTruthy();
  });

  it("holds contributors' and applications' posts, not an editor's", () => {
    const policy = "contributorsAndApplications";

    expect(needsApproval(policy, editor)).toBeFalsy();
    expect(needsApproval(policy, contributor)).toBeTruthy();
    expect(needsApproval(policy, apiKeyIn(workspaceId))).toBeTruthy();
    expect(needsApproval(policy, throughClient)).toBeTruthy();
  });

  it("takes an API key and an OAuth client for applications", () => {
    expect(isApplication(throughClient)).toBeTruthy();
    expect(isApplication(apiKeyIn(workspaceId))).toBeTruthy();
    expect(isApplication(editor)).toBeFalsy();
  });

  it("holds everyone's posts when it is always", () => {
    for (const actor of [editor, contributor, throughClient]) {
      expect(needsApproval("always", actor)).toBeTruthy();
    }
  });

  it("lets those who write drafts ask, but not viewers nor staff acting as someone", () => {
    for (const policy of ["contributorsAndApplications", "always"] as const) {
      expect(maySubmit(policy, contributor)).toBeTruthy();
      expect(maySubmit(policy, viewer)).toBeFalsy();
      expect(maySubmit(policy, impersonated)).toBeFalsy();
    }
  });
});

describe("what people type", () => {
  it("keeps a comment's line breaks and drops control characters", () => {
    expect(
      commentText("  Looks good.\r\n\u0000\u001B[31mRed‮?\u0007\n\n\n\n\n\nEnd ")
    ).toStrictEqual(Option.some("Looks good.\n[31mRed?\n\n\nEnd"));
  });

  it("keeps markup as the text it is", () => {
    expect(commentText("<script>alert(1)</script>")).toStrictEqual(
      Option.some("<script>alert(1)</script>")
    );
  });

  it("refuses an empty or oversized comment", () => {
    expect(commentText(" \n\u0000 ")).toStrictEqual(Option.none());

    // Half a surrogate pair is no character: what is kept is well formed.
    const lone = String.fromCodePoint(0xd8_00);

    expect(
      Option.getOrThrow(commentText(`Fine${lone}`)).isWellFormed()
    ).toBeTruthy();
    expect(
      Option.getOrThrow(visitorName(`Ada${lone}`)).isWellFormed()
    ).toBeTruthy();
    expect(commentText("a".repeat(maxCommentLength + 1))).toStrictEqual(
      Option.none()
    );
  });

  it("keeps a name on one line", () => {
    expect(visitorName("  Ada\n  Lovelace\u0000 ")).toStrictEqual(
      Option.some("Ada Lovelace")
    );
    expect(visitorName("​")).toStrictEqual(Option.none());
    expect(visitorName("a".repeat(81))).toStrictEqual(Option.none());
  });
});

describe("a comment's selection", () => {
  const text = "Launch day is here. Launch with us on Friday.";

  it("is found where it was", () => {
    const selection = { quote: "Launch with us", start: 20 };

    expect(quotes(selection, text)).toBeTruthy();
    expect(locate(selection, text)).toStrictEqual(
      Option.some({ end: 34, start: 20 })
    );
  });

  it("follows its words when the text before them changes", () => {
    expect(
      locate(
        { quote: "Launch with us", start: 20 },
        "The big launch day is finally here. Launch with us on Friday."
      )
    ).toStrictEqual(Option.some({ end: 50, start: 36 }));
  });

  it("takes the occurrence nearest to where it was", () => {
    expect(locate({ quote: "Launch", start: 18 }, text)).toStrictEqual(
      Option.some({ end: 26, start: 20 })
    );
  });

  it("is lost once the text no longer holds its words", () => {
    expect(
      locate({ quote: "Launch with us", start: 20 }, "Join us on Friday.")
    ).toStrictEqual(Option.none());
  });
});

const link = new ReviewLink({
  access: "comment",
  createdAt: now,
  createdBy: Option.some(userId),
  expiresAt: utc("2026-06-29T07:00:00Z"),
  id: linkId,
  postId,
  revokedAt: Option.none(),
  workspaceId,
});

describe("a review link", () => {
  it("allows what its access includes", () => {
    expect(allows(link, "view")).toBeTruthy();
    expect(allows(link, "comment")).toBeTruthy();
    expect(allows(link, "approve")).toBeFalsy();
  });

  it("works until it expires or is revoked", () => {
    expect(standingOf(link, now)).toBe("active");
    expect(standingOf(link, link.expiresAt)).toBe("expired");
    expect(standingOf(revoke(link, now), now)).toBe("revoked");
  });

  it("lasts 14 days unless told, and 90 at most", () => {
    expect(expiryOf(now, Option.none())).toStrictEqual(
      utc("2026-06-29T07:00:00Z")
    );
    expect(expiryOf(now, Option.some(Duration.days(400)))).toStrictEqual(
      utc("2026-09-13T07:00:00Z")
    );
    expect(expiryOf(now, Option.some(Duration.seconds(1)))).toStrictEqual(
      utc("2026-06-15T08:00:00Z")
    );
  });
});

const member: Reviewer = { _tag: "member", userId: Option.some(userId) };

const visitor: Reviewer = {
  _tag: "visitor",
  linkId,
  name: Option.some("Ada Lovelace"),
};

const pending = new ApprovalRequest({
  decision: Option.none(),
  id: ApprovalRequestIdSchema.make("00000000-0000-7000-8000-000000000003"),
  postId,
  requestedAt: now,
  requestedBy: Option.some(userId),
  requestedVia: "member",
  scheduledAt: utc("2026-06-16T08:00:00Z"),
  status: "pending",
  subjectHash: "first",
  timeZone: TimeZoneIdSchema.make("Europe/Paris"),
  workspaceId,
});

describe("an approval request", () => {
  it("is approved once, by whoever decided, for what the post said", () => {
    const approved = Result.getOrThrow(approve(pending, visitor, now));

    expect(approved.status).toBe("approved");
    expect(approved.decision).toStrictEqual(
      Option.some({ at: now, by: visitor })
    );
    expect(Result.getFailure(approve(approved, member, now))).toStrictEqual(
      Option.some(new ApprovalNotPending({ postId }))
    );
  });

  it("stands for the post while it says what it said", () => {
    const approved = Result.getOrThrow(approve(pending, visitor, now));

    expect(covers(approved, "first")).toBeTruthy();
    expect(covers(approved, "second")).toBeFalsy();
    expect(covers(pending, "first")).toBeFalsy();
  });

  it("sends the post back, which approves nothing", () => {
    const sentBack = Result.getOrThrow(requestChanges(pending, member, now));

    expect(sentBack.status).toBe("changesRequested");
    expect(covers(sentBack, "first")).toBeFalsy();
  });

  it("is withdrawn only while it is pending", () => {
    const approved = Result.getOrThrow(approve(pending, member, now));

    expect(withdraw(pending).status).toBe("withdrawn");
    expect(withdraw(approved)).toBe(approved);
  });
});

describe("a comment thread", () => {
  const root = new ReviewComment({
    anchor: Option.none(),
    author: visitor,
    createdAt: now,
    id: ReviewCommentIdSchema.make("00000000-0000-7000-8000-000000000004"),
    parentId: Option.none(),
    postId,
    resolution: Option.none(),
    text: "Could we say Friday?",
    workspaceId,
  });

  const reply = new ReviewComment({
    anchor: Option.none(),
    author: member,
    createdAt: now,
    id: ReviewCommentIdSchema.make("00000000-0000-7000-8000-000000000005"),
    parentId: Option.some(root.id),
    postId,
    resolution: Option.none(),
    text: "We can.",
    workspaceId,
  });

  it("is resolved and reopened on the comment that started it", () => {
    const resolved = Result.getOrThrow(setResolved(root, true, member, now));

    expect(resolved.resolution).toStrictEqual(
      Option.some({ at: now, by: member })
    );
    expect(
      Result.getOrThrow(setResolved(resolved, false, member, now)).resolution
    ).toStrictEqual(Option.none());
  });

  it("is not resolved on an answer", () => {
    expect(
      Result.isFailure(setResolved(reply, true, member, now))
    ).toBeTruthy();
  });
});

describe("retention", () => {
  it("drops names after 24 months", () => {
    expect(cutoffsAt(now)).toStrictEqual({
      namesBefore: utc("2024-06-15T07:00:00Z"),
    });
  });
});
