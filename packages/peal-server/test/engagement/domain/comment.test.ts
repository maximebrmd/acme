import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option } from "effect";

import {
  forgetComment,
  markAnswered,
  markUnanswered,
  maxAuthorHandleLength,
  maxAuthorNameLength,
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
    expect(comment(1, { hidden: Option.some(true) }).state).toBe("hidden");
  });

  it("keeps nothing a database refuses or a screen acts on, whatever a platform gives", () => {
    const nul = String.fromCodePoint(0);
    const lone = String.fromCodePoint(0xd8_00);
    const escape = String.fromCodePoint(0x1b);
    const override = String.fromCodePoint(0x20_2e);
    const replaced = String.fromCodePoint(0xff_fd);

    const hostile = comment(1, {
      author: Option.some({
        displayName: Option.some(`Ada${nul}\n${override}Lovelace${lone}`),
        handle: ` ada${escape}@social.example\n`,
        platformId: `70${nul}01`,
      }),
      parentPlatformId: Option.some(`20${nul}00`),
      permalink: Option.some(`https://social.example/@ada/1${nul}`),
      platformCommentId: `20${nul}01`,
      text: `Hello${nul}\r\nthere${lone}${escape}[2J`,
    });

    expect(hostile.text).toBe(`Hello\nthere${replaced}[2J`);
    expect(hostile.author).toStrictEqual(
      Option.some({
        displayName: Option.some(`Ada Lovelace${replaced}`),
        handle: "ada@social.example",
        platformId: "7001",
      })
    );
    expect(hostile.platformCommentId).toBe("2001");
    expect(hostile.parentPlatformId).toStrictEqual(Option.some("2000"));
    expect(hostile.permalink).toStrictEqual(
      Option.some("https://social.example/@ada/1")
    );
  });

  it("bounds a name, a handle and a link", () => {
    const long = comment(2, {
      author: Option.some({
        displayName: Option.some("n".repeat(1000)),
        handle: "h".repeat(1000),
        platformId: "7002",
      }),
      permalink: Option.some(`https://social.example/${"p".repeat(5000)}`),
    });

    expect(
      Option.getOrThrow(long.author).displayName.pipe(Option.getOrThrow)
    ).toHaveLength(maxAuthorNameLength);
    expect(Option.getOrThrow(long.author).handle).toHaveLength(
      maxAuthorHandleLength
    );
    // A link too long to be one is no link.
    expect(long.permalink).toStrictEqual(Option.none());
  });

  it("keeps a link only when it is a web address, and reads an edit like a first read", () => {
    expect(
      comment(3, { permalink: Option.some("data:text/html,synthetic") })
        .permalink
    ).toStrictEqual(Option.none());

    const edited = refreshComment(
      comment(4),
      reading(4, { text: `Edited${String.fromCodePoint(0)}` })
    );

    expect(edited.text).toBe("Edited");
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
