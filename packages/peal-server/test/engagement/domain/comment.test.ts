import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option } from "effect";

import {
  forgetComment,
  markAnswered,
  markUnanswered,
  maxCommentLength,
  refreshComment,
  setHidden,
  setLiked,
} from "#engagement/domain/comment.ts";
import { comment, publishedAt, reading } from "#test/engagement/support.ts";

const later = DateTime.addDuration(publishedAt, "1 hour");

describe("a comment", () => {
  it("is new when first read, with its author as the platform shows them", () => {
    const received = comment(1);

    expect(received.state).toBe("new");
    expect(received.text).toBe("Comment 1");
    expect(received.author).toStrictEqual(
      Option.some({
        displayName: Option.some("Reader 1"),
        handle: "reader1@social.example",
        platformId: "7001",
      })
    );
  });

  it("is hidden when the account already hid it on the platform", () => {
    expect(comment(1, { hidden: true }).state).toBe("hidden");
  });

  it("keeps at most the longest text Peal stores", () => {
    const long = comment(1, { text: "é".repeat(maxCommentLength + 5) });

    expect(long.text).toBe("é".repeat(maxCommentLength));
  });

  it("is answered once, at the first answer", () => {
    const answered = markAnswered(comment(1), later);

    const again = markAnswered(answered, DateTime.addDuration(later, "1 hour"));

    expect(answered.state).toBe("answered");
    expect(again.answeredAt).toStrictEqual(Option.some(later));
  });

  it("waits for an answer again when a member says so", () => {
    const reopened = markUnanswered(markAnswered(comment(1), later));

    expect(reopened.state).toBe("new");
    expect(reopened.answeredAt).toStrictEqual(Option.none());
  });

  it("stays hidden when answered, and is answered again once shown", () => {
    const hidden = markAnswered(setHidden(comment(1), true), later);

    expect(hidden.state).toBe("hidden");
    expect(setHidden(hidden, false).state).toBe("answered");
    expect(setHidden(setHidden(comment(1), true), false).state).toBe("new");
  });

  it("follows the platform when its author edits it", () => {
    const edited = refreshComment(
      markAnswered(comment(1), later),
      reading(1, { text: "Edited" })
    );

    expect(edited.text).toBe("Edited");
    expect(edited.state).toBe("answered");
    expect(edited.receivedAt).toStrictEqual(comment(1).receivedAt);
  });

  it("keeps the like Peal knows of when a read cannot tell", () => {
    const liked = setLiked(comment(1), true);

    expect(refreshComment(liked, reading(1)).liked).toBeTruthy();
    expect(
      refreshComment(liked, reading(1, { liked: Option.some(false) })).liked
    ).toBeFalsy();
  });

  it("keeps neither text nor author once the platform no longer shows it", () => {
    const gone = forgetComment(markAnswered(comment(1), later));

    expect(gone.state).toBe("deleted");
    expect(gone.text).toBe("");
    expect(gone.author).toStrictEqual(Option.none());
    expect(gone.permalink).toStrictEqual(Option.none());
  });

  it("is neither hidden nor liked once deleted", () => {
    const gone = forgetComment(comment(1));

    expect(setHidden(gone, true).state).toBe("deleted");
    expect(setLiked(gone, true).liked).toBeFalsy();
    expect(markAnswered(gone, later).state).toBe("deleted");
  });

  it("is shown again when the platform shows it again", () => {
    expect(refreshComment(forgetComment(comment(1)), reading(1)).state).toBe(
      "new"
    );
  });
});
