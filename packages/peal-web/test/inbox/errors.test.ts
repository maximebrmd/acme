import { describe, expect, it } from "@effect/vitest";
import { Exit, Option } from "effect";
import {
  Forbidden,
  InboxActionFailed,
  InboxActionUnavailable,
  InboxCommentGone,
  InboxCommentNotFound,
  InboxReplyNotFound,
  InboxThreadNotFound,
  ReplyInvalid,
  ReplyPending,
  ReplyStatusConflict,
} from "peal-contract";

import { inboxErrorOf } from "#inbox/errors.ts";

describe(inboxErrorOf, () => {
  it("is none for a call that worked", () => {
    expect(inboxErrorOf(Exit.succeed("done"))).toStrictEqual(Option.none());
  });

  it("keeps how long a reply is and how long it may be", () => {
    expect(
      inboxErrorOf(
        Exit.fail(
          new ReplyInvalid({
            length: 512,
            maximum: 500,
            reason: "tooLong",
            unit: "codePoints",
          })
        )
      )
    ).toStrictEqual(
      Option.some({ key: "replyTooLong", length: 512, maximum: 500 })
    );
  });

  it("tells an empty reply apart", () => {
    expect(
      inboxErrorOf(
        Exit.fail(
          new ReplyInvalid({
            length: null,
            maximum: null,
            reason: "empty",
            unit: null,
          })
        )
      )
    ).toStrictEqual(Option.some({ key: "replyEmpty" }));
  });

  it("keeps why a channel cannot do what was asked", () => {
    expect(
      inboxErrorOf(
        Exit.fail(
          new InboxActionUnavailable({ ability: "hide", standing: "reconnect" })
        )
      )
    ).toStrictEqual(Option.some({ key: "unavailable", standing: "reconnect" }));
  });

  it("keeps why the platform did not do it, and where a reply stands", () => {
    expect(
      inboxErrorOf(Exit.fail(new InboxActionFailed({ reason: "rateLimited" })))
    ).toStrictEqual(
      Option.some({ key: "actionFailed", reason: "rateLimited" })
    );
    expect(
      inboxErrorOf(Exit.fail(new ReplyStatusConflict({ status: "withdrawn" })))
    ).toStrictEqual(
      Option.some({ key: "statusConflict", status: "withdrawn" })
    );
  });

  it.each([
    [new Forbidden(), "forbidden"],
    [new InboxThreadNotFound(), "threadNotFound"],
    [new InboxCommentNotFound(), "commentNotFound"],
    [new InboxReplyNotFound(), "replyNotFound"],
    [new InboxCommentGone(), "commentGone"],
    [
      new ReplyPending({ replyId: "00000000-0000-7000-8000-000000000001" }),
      "replyPending",
    ],
    [{ _tag: "Unauthenticated" }, "unknown"],
  ])("explains %o as %s", (failure, key) => {
    expect(inboxErrorOf(Exit.fail(failure))).toStrictEqual(
      Option.some({ key })
    );
  });

  it("explains a server that did not answer as unknown", () => {
    expect(inboxErrorOf(Exit.die("down"))).toStrictEqual(
      Option.some({ key: "unknown" })
    );
  });
});
