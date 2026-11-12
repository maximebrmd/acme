import { DateTime, Duration, Option } from "effect";

import type { SendOutcome } from "#engagement/domain/reply.ts";
import type { OutgoingReply } from "#engagement/infrastructure/platforms/engagement-platform.ts";

// How a reply an earlier run may have made is looked for, on the
// platforms that take no idempotency key (Meta's, YouTube): nothing here
// sends a reply again.

/** A resumed reply nobody can tell the fate of: a person checks. */
export const undecided: SendOutcome = {
  _tag: "unconfirmed",
  reason: "interrupted",
};

/** A reply that may have reached the platform without an answer coming back. */
export const unanswered: SendOutcome = {
  _tag: "unconfirmed",
  reason: "noResponse",
};

/**
 * How far the platform's clock and Peal's may differ when a reply's time on the platform
 * is compared with when Peal wrote it.
 */
const clockSkew = Duration.minutes(1);

/** A reply the account made under a comment, as its platform lists it. */
export interface ListedReply {
  readonly fromAccount: boolean;
  readonly id: string;
  readonly text: string;
  readonly writtenAt: Option.Option<DateTime.Utc>;
}

/**
 * What a resumed reply is, from the replies the platform lists under its comment
 * (all of them: a list that may miss some proves nothing): sent when
 * exactly one by the account, written since the reply was (give or take
 * `clockSkew`), has its text and is none of the thread's other replies
 * (`takenIds`); otherwise unconfirmed, for a person to
 * settle. None found may be one the platform has not listed yet, and two alike
 * cannot be told apart: neither is sent again.
 */
export const foundAmong = (
  reply: OutgoingReply,
  listed: readonly ListedReply[]
): SendOutcome => {
  const since = DateTime.subtractDuration(reply.createdAt, clockSkew);
  const text = reply.text.trim();

  const matching = listed.filter(
    (candidate) =>
      candidate.fromAccount &&
      !reply.takenIds.includes(candidate.id) &&
      candidate.text.trim() === text &&
      Option.exists(candidate.writtenAt, (at) =>
        DateTime.isGreaterThanOrEqualTo(at, since)
      )
  );

  const [only] = matching;

  return matching.length === 1 && only !== undefined
    ? { _tag: "sent", permalink: Option.none(), platformCommentId: only.id }
    : undecided;
};
