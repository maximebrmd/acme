import { Match, Option } from "effect";
import type { RecyclingRule as RuleView } from "peal-contract";

import type { ListedRule } from "#publishing/application/recycling.ts";
import type { PostOrigin } from "#publishing/domain/post-origin.ts";
import type { LocalDate } from "#shared/domain/wall-clock.ts";

const pad = (value: number, length: number) =>
  String(value).padStart(length, "0");

/** A calendar date as the contract writes it: YYYY-MM-DD. */
export const dayOf = ({ day, month, year }: LocalDate): string =>
  `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;

// How the rule's starter reached Peal, as a post's origin is shown.
const originView = (origin: PostOrigin): RuleView["startedVia"] =>
  Match.valueTags(origin, {
    apiKey: ({ apiKeyId, name }) => ({
      id: apiKeyId,
      name: name ?? null,
      via: "apiKey" as const,
    }),
    application: ({ clientId, name }) => ({
      id: clientId,
      name: name ?? null,
      via: "application" as const,
    }),
    web: () => ({ id: null, name: null, via: "web" as const }),
  });

/** What clients see of a rule, and of the posts it will make. */
export const ruleView = ({ coming, rule }: ListedRule): RuleView => ({
  anchorAt: rule.anchorAt,
  coming: coming.map(({ at, occurrence, variant }) => ({
    at,
    occurrence,
    variant: Option.getOrNull(variant),
  })),
  count: Option.getOrNull(rule.count),
  createdAt: rule.createdAt,
  endedReason: rule.status._tag === "ended" ? rule.status.reason : null,
  every: rule.interval,
  id: rule.id,
  lastDueAt: rule.lastDueAt,
  made: rule.made,
  nextDueAt: Option.getOrNull(rule.nextDueAt),
  queueId: Option.getOrNull(rule.queueId),
  sourcePostId: rule.sourcePostId,
  startedBy: Option.getOrNull(rule.startedBy),
  startedVia: originView(rule.startedVia),
  status: rule.status._tag,
  timeZone: rule.timeZone,
  until: rule.until.pipe(Option.map(dayOf), Option.getOrNull),
  variants: rule.variants.map(({ overrides, text }) => ({
    overrides: overrides.map(({ channelId, text: own }) => ({
      channelId,
      text: own,
    })),
    text,
  })),
});
