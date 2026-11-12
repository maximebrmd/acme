import { describe, expect, it } from "@effect/vitest";
import { DateTime } from "effect";

import { toCommentView } from "#engagement/api/inbox-view.ts";
import { expireComment, forgetComment } from "#engagement/domain/comment.ts";
import { comment, publishedAt } from "#test/engagement/support.ts";

// What a comment shows of why Peal keeps nothing of it: one forgotten
// because its platform bounds how long Peal keeps it without reading it
// again is told apart from one its platform no longer shows.

describe("a comment's view", () => {
  it("says a comment was forgotten for its age", () => {
    const view = toCommentView(
      expireComment(comment(1), DateTime.addDuration(publishedAt, "30 days"))
    );

    expect(view.state).toBe("deleted");
    expect(view.forgotten).toBe("expired");
    expect(view.text).toBe("");
  });

  it("says nothing of it for a comment deleted on the platform, or kept", () => {
    expect(toCommentView(forgetComment(comment(1)))).not.toHaveProperty(
      "forgotten"
    );
    expect(toCommentView(comment(1))).not.toHaveProperty("forgotten");
  });
});
