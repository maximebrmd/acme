import { retentionPeriods } from "peal-contract/data-processing";

// The retention periods as docs variables, `{{keep-legal-identity-en}}`
// and the like, from the contract's registry, which the privacy policy's
// table and each user's export are written from: the docs never copy a
// period by hand.

const locales = ["en", "fr"] as const;

type Locale = (typeof locales)[number];

type Unit = "days" | "months" | "weeks" | "years";

const words: Readonly<
  Record<Locale, Readonly<Record<Unit, readonly [one: string, many: string]>>>
> = {
  en: {
    days: ["day", "days"],
    months: ["month", "months"],
    weeks: ["week", "weeks"],
    years: ["year", "years"],
  },
  fr: {
    days: ["jour", "jours"],
    months: ["mois", "mois"],
    weeks: ["semaine", "semaines"],
    years: ["an", "ans"],
  },
};

// "1 year", "5 years"; "1 an", "5 ans".
const written = (locale: Locale, count: number, unit: Unit): string => {
  const [one, many] = words[locale][unit];

  return `${count} ${count === 1 ? one : many}`;
};

// The docs' names for the registry's periods.
const names = {
  analytics: "analytics",
  analyticsDisconnected: "analytics-disconnected",
  analyticsLinkedIn: "analytics-linkedin",
  analyticsPinterest: "analytics-pinterest",
  auditLog: "audit",
  backups: "backups",
  banRecords: "bans",
  erasureLedger: "erasure-ledger",
  legalAccount: "legal-account",
  legalConnections: "legal-connections",
  legalDisclosures: "legal-disclosures",
  legalIdentity: "legal-identity",
  metrics: "metrics",
  serverLogs: "logs",
  traces: "traces",
} as const satisfies Partial<Record<keyof typeof retentionPeriods, string>>;

const units: readonly Unit[] = ["days", "weeks", "months", "years"];

// A period's count and unit, whichever unit it is written in.
const partsOf = (
  period: Partial<Record<Unit, number>>
): readonly (readonly [Unit, number])[] =>
  units.flatMap((unit) => {
    const count = period[unit];

    return count === undefined ? [] : [[unit, count] as const];
  });

const namedPeriods: readonly (readonly [
  string,
  Partial<Record<Unit, number>>,
])[] = [
  [names.analytics, retentionPeriods.analytics],
  [names.analyticsDisconnected, retentionPeriods.analyticsDisconnected],
  [names.analyticsLinkedIn, retentionPeriods.analyticsLinkedIn],
  [names.analyticsPinterest, retentionPeriods.analyticsPinterest],
  [names.auditLog, retentionPeriods.auditLog],
  [names.backups, retentionPeriods.backups],
  [names.banRecords, retentionPeriods.banRecords],
  [names.erasureLedger, retentionPeriods.erasureLedger],
  [names.legalAccount, retentionPeriods.legalAccount],
  [names.legalConnections, retentionPeriods.legalConnections],
  [names.legalDisclosures, retentionPeriods.legalDisclosures],
  [names.legalIdentity, retentionPeriods.legalIdentity],
  [names.metrics, retentionPeriods.metrics],
  [names.serverLogs, retentionPeriods.serverLogs],
  [names.traces, retentionPeriods.traces],
];

/** Every retention period, in each language, by variable name. */
export const retentionVariables: Readonly<Record<string, string>> =
  Object.fromEntries(
    namedPeriods.flatMap(([name, period]) =>
      partsOf(period).flatMap(([unit, count]) =>
        locales.map((locale): [string, string] => [
          `keep-${name}-${locale}`,
          written(locale, count, unit),
        ])
      )
    )
  );
