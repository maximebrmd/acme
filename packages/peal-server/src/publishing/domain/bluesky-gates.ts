import { Option, Schema } from "effect";

import {
  createsRecords,
  postgateCollection,
  threadgateCollection,
} from "#shared/domain/bluesky-scopes.ts";

import type { AccountRestriction } from "./account-restriction.ts";
import { BlueskyOptions, gatesAskedBy } from "./bluesky-options.ts";
import type { ChannelOnPlatform } from "./content-rules.ts";
import type { ContentViolation } from "./content-violation.ts";
import type { TargetOptions } from "./target-options.ts";

// Each gate option, and the collection of the record it writes.
const gateCollections = {
  disableQuotes: postgateCollection,
  replies: threadgateCollection,
} as const;

type GateField = keyof typeof gateCollections;

const gateFields: readonly GateField[] = ["disableQuotes", "replies"];

const ungranted = (scopes: readonly string[]): readonly GateField[] =>
  gateFields.filter(
    (field) => !createsRecords(scopes, [gateCollections[field]])
  );

const isBluesky = Schema.is(BlueskyOptions);

/**
 * The gates a Bluesky channel's scopes do not let Peal write, said
 * beforehand: each option needs the channel to be connected again, as one
 * connected before Peal asked for them has not granted them.
 */
export const gateRestrictions = (
  scopes: readonly string[]
): readonly AccountRestriction[] =>
  ungranted(scopes).map((field) => ({ _tag: "optionNeedsReconnect", field }));

/**
 * What scheduling refuses on a Bluesky channel whose scopes do not let
 * Peal write the gates the options ask for: each such option, as invalid
 * there (`gateRestrictions` says why).
 */
export const gateViolationsOn = (
  channel: ChannelOnPlatform,
  options: Option.Option<TargetOptions>,
  scopes: readonly string[]
): readonly ContentViolation[] => {
  const asked = options.pipe(
    Option.filter(isBluesky),
    Option.map(gatesAskedBy),
    Option.getOrElse((): readonly GateField[] => [])
  );

  const missing = ungranted(scopes);

  return asked
    .filter((field) => missing.includes(field))
    .map((field) => ({ _tag: "optionInvalid", ...channel, field }));
};
