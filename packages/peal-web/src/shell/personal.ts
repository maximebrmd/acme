/** The person's own pages, across their workspaces. */
export type PersonalPage =
  | "account"
  | "agenda"
  | "notices"
  | "overview"
  | "report";

const paths: Readonly<Record<PersonalPage, string>> = {
  account: "/app/account",
  agenda: "/app/agenda",
  notices: "/app/notices",
  overview: "/app",
  report: "/app/report",
};

/** The order the sidebar lists them in. */
export const personalPages: readonly PersonalPage[] = [
  "overview",
  "agenda",
  "report",
  "notices",
  "account",
];

/** Where a personal page is. */
export const personalHrefOf = (page: PersonalPage): string => paths[page];

/**
 * The personal page a path (without its locale) shows: its own address, or
 * one under it (the notices' preferences are the notices'); null for a
 * path that is none of them.
 */
export const personalPageAt = (pathname: string): PersonalPage | null =>
  personalPages.find((page) =>
    page === "overview"
      ? pathname === paths.overview
      : pathname === paths[page] || pathname.startsWith(`${paths[page]}/`)
  ) ?? null;
