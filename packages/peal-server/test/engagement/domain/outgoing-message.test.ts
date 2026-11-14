import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option, Result } from "effect";

import {
  beginMessage,
  confirmMessage,
  forgetMessageAuthor,
  messageAttempted,
  settleMessage,
  writeMessage,
} from "#engagement/domain/outgoing-message.ts";
import type { OutgoingMessage } from "#engagement/domain/outgoing-message.ts";
import {
  conversation,
  memberId,
  messagedAt,
  outgoingMessageId,
} from "#test/engagement/support.ts";

const later = DateTime.addDuration(messagedAt, "1 minute");

const ok = <A, E>(result: Result.Result<A, E>): A => Result.getOrThrow(result);

const written = (): OutgoingMessage =>
  writeMessage(
    outgoingMessageId(1),
    conversation(1),
    Option.some(memberId),
    "Thanks for writing!",
    messagedAt
  );

describe("a message sent from Peal", () => {
  it("is on its way when written, and attempted once a run set out", () => {
    const message = written();

    expect(message.status._tag).toBe("sending");
    expect(messageAttempted(message)).toBeFalsy();

    const begun = ok(beginMessage(message, later));

    expect(messageAttempted(begun)).toBeTruthy();
    // A second run keeps the first attempt's instant.
    expect(
      ok(beginMessage(begun, DateTime.addDuration(later, "1 hour"))).status
    ).toStrictEqual(begun.status);
  });

  it("ends once, as the platform answered", () => {
    const sent = ok(
      settleMessage(written(), { _tag: "sent", platformMessageId: "m1" }, later)
    );

    expect(sent.status).toStrictEqual({
      _tag: "sent",
      at: later,
      platformMessageId: Option.some("m1"),
    });
    expect(
      Result.isFailure(
        settleMessage(sent, { _tag: "failed", reason: "refused" }, later)
      )
    ).toBeTruthy();
    expect(Result.isFailure(beginMessage(sent, later))).toBeTruthy();
  });

  it("left unconfirmed is settled by a member, for good", () => {
    const unconfirmed = ok(
      settleMessage(
        written(),
        { _tag: "unconfirmed", reason: "noResponse" },
        later
      )
    );

    expect(ok(confirmMessage(unconfirmed, true, later)).status).toStrictEqual({
      _tag: "sent",
      at: later,
      platformMessageId: Option.none(),
    });

    const notSent = ok(confirmMessage(unconfirmed, false, later));

    expect(notSent.status).toStrictEqual({
      _tag: "failed",
      at: later,
      reason: "notSent",
    });
    expect(Result.isFailure(confirmMessage(notSent, true, later))).toBeTruthy();
    expect(
      Result.isFailure(confirmMessage(written(), true, later))
    ).toBeTruthy();
  });

  it("forgets its author once their account is closed", () => {
    expect(forgetMessageAuthor(written()).authorId).toStrictEqual(
      Option.none()
    );
  });
});
