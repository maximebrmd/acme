import { Option } from "effect";
import type { AccountStanding } from "peal-contract";

import type { OptionValues } from "./target-options.ts";
import type { FieldLimits } from "./tiktok-account.ts";

// Bluesky's gates (who may reply, quotes) need scopes a channel connected
// before Peal asked for them lacks. The channel's capabilities say which
// (`optionNeedsReconnect`): there the composer offers neither gate and
// says reconnecting the channel grants them, as scheduling would refuse
// them.

const reconnect = "bluesky.gatesNeedReconnect";

// The gates who may reply sets: everyone needs no record.
const replyGates = ["nobody", "limited"] as const;

/**
 * How Bluesky's fields show on a channel whose account `standing`
 * describes: a gate the channel cannot set is closed, with the line saying
 * to reconnect it, unless the post holds it already, which stays to be
 * seen and taken off. Nothing is closed while the standing is unknown:
 * scheduling checks it.
 */
export const blueskyLimits = (
  standing: Option.Option<AccountStanding>,
  values: OptionValues
): ReadonlyMap<string, FieldLimits> => {
  const needed = new Set(
    standing.pipe(
      Option.map((known) =>
        known._tag === "read"
          ? known.restrictions.flatMap((restriction) =>
              restriction._tag === "optionNeedsReconnect"
                ? [restriction.field]
                : []
            )
          : []
      ),
      Option.getOrElse((): readonly string[] => [])
    )
  );

  const limits = new Map<string, FieldLimits>();

  if (needed.has("replies")) {
    limits.set("replies", {
      closedChoices: new Map(
        replyGates.flatMap((gate) =>
          values["replies"] === gate ? [] : [[gate, reconnect] as const]
        )
      ),
    });
  }

  if (needed.has("disableQuotes")) {
    limits.set(
      "disableQuotes",
      values["disableQuotes"] === true
        ? { note: reconnect }
        : { locked: reconnect }
    );
  }

  return limits;
};
