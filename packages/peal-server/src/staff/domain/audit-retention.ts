import { DateTime, Option } from "effect";

/**
 * How long the audit log keeps an event. Staff's actions on accounts are
 * kept 12 months, the span the CNIL recommends for logs of what authorised
 * users did (délibération 2021-122). A ban, and the lifting of one, is kept
 * 5 years: a user may sue over a restriction for 5 years from the day they
 * learnt of it (art. 2224 of the Code civil), and Peal must then show what
 * it did and why. A ban that lasted longer is kept 12 months past its end,
 * whichever is later; a ban until lifted ends when it is lifted, and is
 * kept while it holds. Events about a closed account lose its id and
 * reason at once (StaffRecords.forgetUser), but a ban's or an unban's,
 * which keeps its reason, and a keyed pseudonym of the account's email
 * address instead of its id, so the purpose holds once the account is
 * closed too, until the same cutoff; this is the limit for every event.
 */
export const auditRetention = {
  bans: { years: 5 },
  general: { months: 12 },
} as const;

/** The actions kept as long as bans are. */
export const banActions: readonly string[] = ["ban", "unban"];

/**
 * The instants an event is compared with at `now`: an event older than
 * `general` has expired, unless it is a ban's, which expires once older
 * than `bans` and once the ban ended before `general`.
 */
export interface AuditCutoffs {
  readonly bans: DateTime.Utc;
  readonly general: DateTime.Utc;
}

/** The cutoffs at `now`. */
export const auditCutoffs = (now: DateTime.Utc): AuditCutoffs => ({
  bans: DateTime.subtract(now, auditRetention.bans),
  general: DateTime.subtract(now, auditRetention.general),
});

/** What retention reads of an event. */
export interface RetainedEvent {
  readonly action: string;
  readonly at: DateTime.Utc;
  readonly banExpiresAt: Option.Option<DateTime.Utc>;
  /**
   * Whether it still names the account, which closing the account forgets:
   * a ban until lifted then no longer holds.
   */
  readonly hasTarget: boolean;
  /** For a ban, when a later unban of the same account lifted it, if one did. */
  readonly liftedAt: Option.Option<DateTime.Utc>;
}

/**
 * Whether the audit log no longer keeps the event at `now`. A ban ends at
 * its end, or, until lifted, once lifted; one that still holds is kept.
 */
export const isExpired = (event: RetainedEvent, now: DateTime.Utc): boolean => {
  const { bans, general } = auditCutoffs(now);

  if (!banActions.includes(event.action)) {
    return DateTime.isLessThan(event.at, general);
  }

  if (!DateTime.isLessThan(event.at, bans)) {
    return false;
  }

  const ended =
    event.action === "ban"
      ? Option.orElse(event.banExpiresAt, () => event.liftedAt)
      : event.banExpiresAt;

  return Option.match(ended, {
    // An unban, or a ban until lifted whose account is gone.
    onNone: () => event.action !== "ban" || !event.hasTarget,
    onSome: (end) => DateTime.isLessThan(end, general),
  });
};
