import { DateTime, Option } from "effect";

/**
 * How long the audit log keeps an event. Staff's actions on accounts are
 * kept 12 months, the span the CNIL recommends for logs of what authorised
 * users did. A ban, and the lifting of one, is kept 3 years, so a user can
 * contest a restriction and Peal answer for it, or 12 months past the end
 * of a ban that lasted longer, whichever is later. Events about a closed
 * account lose its id and reason at once (StaffRecords.forgetUser); this
 * is the limit for every event.
 */
export const auditRetention = {
  bans: { years: 3 },
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
}

/** Whether the audit log no longer keeps the event at `now`. */
export const isExpired = (event: RetainedEvent, now: DateTime.Utc): boolean => {
  const { bans, general } = auditCutoffs(now);

  if (!banActions.includes(event.action)) {
    return DateTime.isLessThan(event.at, general);
  }

  return (
    DateTime.isLessThan(event.at, bans) &&
    Option.match(event.banExpiresAt, {
      onNone: () => true,
      onSome: (end) => DateTime.isLessThan(end, general),
    })
  );
};
