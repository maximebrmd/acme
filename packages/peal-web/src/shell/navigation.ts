import type { Permission } from "peal-contract";

/**
 * The two modes of a workspace's frame (DESIGN.md): Studio runs its
 * channels and posts; Console builds on the API. A page belongs to one, so
 * the address carries the mode.
 */
export type Mode = "console" | "studio";

/** The sections whose pages the sidebar opens in place of its own. */
export type Section = "posts" | "settings";

/** The workspace pages the sidebar links to. */
export type Page =
  | "ads"
  | "home"
  | "platforms"
  | "analytics"
  | "apiKeys"
  | "approvals"
  | "articles"
  | "assistant"
  | "billing"
  | "calendar"
  | "channelSets"
  | "channels"
  | "drafts"
  | "feeds"
  | "general"
  | "import"
  | "inbox"
  | "invitations"
  | "media"
  | "members"
  | "partner"
  | "posts"
  | "queues"
  | "recycling"
  | "security"
  | "signatures"
  | "tags"
  | "webhooks";

/** Pages that are not in the sidebar, which the breadcrumb still names. */
export type Detail = "article" | "newArticle" | "newPost" | "post" | "thread";

export type Group = "build" | "engage" | "partners";

interface PageRule {
  /** Under /app/<workspace>; "" is the section's own address. */
  readonly path: string;
  readonly mode: Mode;
  readonly section?: Section;
  /** Whether a member with these permissions may open the page. */
  readonly may: (permissions: ReadonlySet<Permission>) => boolean;
}

const anyone = (): boolean => true;

const needs =
  (...required: readonly Permission[]) =>
  (permissions: ReadonlySet<Permission>): boolean =>
    required.every((permission) => permissions.has(permission));

// What each page asks of its member, as the page itself checks it.
const pages: Readonly<Record<Page, PageRule>> = {
  ads: { may: needs("ads:read"), mode: "studio", path: "/ads" },
  analytics: {
    may: needs("analytics:read"),
    mode: "studio",
    path: "/analytics",
  },
  apiKeys: {
    may: needs("apiKey:read"),
    mode: "console",
    path: "/settings/api-keys",
  },
  approvals: {
    may: needs("post:read"),
    mode: "studio",
    path: "/approvals",
    section: "posts",
  },
  articles: {
    may: needs("post:read"),
    mode: "studio",
    path: "/articles",
    section: "posts",
  },
  assistant: {
    may: needs("assistant:configure"),
    mode: "studio",
    path: "/settings/assistant",
    section: "settings",
  },
  billing: {
    may: needs("billing:read"),
    mode: "studio",
    path: "/billing",
    section: "settings",
  },
  calendar: { may: anyone, mode: "studio", path: "/calendar" },
  channelSets: {
    may: needs("post:read", "channel:read"),
    mode: "studio",
    path: "/settings/channel-sets",
    section: "settings",
  },
  channels: { may: anyone, mode: "studio", path: "/channels" },
  drafts: {
    may: needs("post:create"),
    mode: "studio",
    path: "/drafts",
    section: "posts",
  },
  feeds: {
    may: needs("post:read"),
    mode: "studio",
    path: "/settings/feeds",
    section: "settings",
  },
  general: {
    may: anyone,
    mode: "studio",
    path: "/settings",
    section: "settings",
  },
  home: { may: anyone, mode: "studio", path: "" },
  import: {
    may: needs("post:read", "post:schedule", "channel:read"),
    mode: "studio",
    path: "/posts/import",
    section: "posts",
  },
  inbox: { may: needs("engagement:read"), mode: "studio", path: "/inbox" },
  invitations: {
    may: needs("invitation:create"),
    mode: "studio",
    path: "/settings/invitations",
    section: "settings",
  },
  media: { may: anyone, mode: "studio", path: "/media" },
  members: {
    may: anyone,
    mode: "studio",
    path: "/settings/members",
    section: "settings",
  },
  partner: {
    may: needs("partner:read"),
    mode: "console",
    path: "/settings/partner",
  },
  platforms: {
    may: needs("channel:read"),
    mode: "console",
    path: "/platforms",
  },
  posts: {
    may: needs("post:read", "channel:read"),
    mode: "studio",
    path: "/posts",
    section: "posts",
  },
  queues: {
    may: needs("post:read", "channel:read"),
    mode: "studio",
    path: "/settings/queues",
    section: "settings",
  },
  recycling: {
    may: needs("post:read"),
    mode: "studio",
    path: "/settings/recycling",
    section: "settings",
  },
  security: {
    may: anyone,
    mode: "studio",
    path: "/settings/security",
    section: "settings",
  },
  signatures: {
    may: needs("post:read"),
    mode: "studio",
    path: "/settings/signatures",
    section: "settings",
  },
  tags: {
    may: needs("post:read"),
    mode: "studio",
    path: "/settings/tags",
    section: "settings",
  },
  webhooks: {
    may: needs("webhook:read"),
    mode: "console",
    path: "/settings/webhooks",
  },
};

// The sidebar's top level in each mode, in groups; a group without a name
// comes first. Posts and Settings open their sections.
const layout: Readonly<
  Record<
    Mode,
    readonly { readonly group: Group | null; readonly pages: readonly Page[] }[]
  >
> = {
  console: [
    { group: null, pages: ["platforms"] },
    { group: "build", pages: ["apiKeys", "webhooks"] },
    { group: "partners", pages: ["partner"] },
  ],
  studio: [
    { group: null, pages: ["home", "calendar", "posts", "channels", "media"] },
    { group: "engage", pages: ["inbox", "analytics", "ads"] },
  ],
};

const sectionPages: Readonly<Record<Section, readonly Page[]>> = {
  posts: ["posts", "drafts", "articles", "approvals", "import"],
  settings: [
    "general",
    "members",
    "invitations",
    "security",
    "billing",
    "tags",
    "signatures",
    "channelSets",
    "queues",
    "recycling",
    "feeds",
    "assistant",
  ],
};

export interface Link {
  readonly page: Page;
  readonly href: string;
  readonly current: boolean;
  /** The section the link opens, for Posts and Settings. */
  readonly opens: Section | null;
}

export interface Navigation {
  readonly mode: Mode;
  /** The page open, or null on a page the sidebar does not list. */
  readonly current: Page | null;
  /** The section the open page belongs to, which the sidebar shows. */
  readonly section: Section | null;
  /** The sidebar's top level for the mode. */
  readonly groups: readonly {
    readonly group: Group | null;
    readonly links: readonly Link[];
  }[];
  /** The open section's pages, when there is one. */
  readonly sectionLinks: readonly Link[];
  /** Settings, at the sidebar's foot, which opens its section. */
  readonly settings: Link;
  /** Where each mode starts, or null for a mode the member may not use. */
  readonly modes: Readonly<Record<Mode, string | null>>;
  /** What the top bar names: the section, then the page. */
  readonly breadcrumb: {
    readonly section: Section | null;
    readonly page: Detail | Page | null;
  };
}

/** Where a page is, for a workspace. */
export const hrefOf = (workspaceId: string, page: Page): string =>
  `/app/${workspaceId}${pages[page].path}`;

/** The page a path shows, and which page under it, if any. */
interface PageAt {
  readonly page: Page | null;
  readonly detail: Detail | null;
}

// Every page, from the sidebar's top levels and its sections, which
// between them list each once at least.
const pageNames: readonly Page[] = [
  ...Object.values(layout).flatMap((groups) =>
    groups.flatMap(({ pages: listed }) => listed)
  ),
  ...Object.values(sectionPages).flat(),
];

// The page a path inside a workspace shows: its own path, or the longest
// page path it is under (a post's page is under Posts).
const pageAt = (path: string): PageAt => {
  if (path === "/posts/new") {
    return { detail: "newPost", page: "posts" };
  }

  const exact = pageNames.find((page) => pages[page].path === path);

  if (exact !== undefined) {
    return { detail: null, page: exact };
  }

  if (path === "/articles/new") {
    return { detail: "newArticle", page: "articles" };
  }

  if (path.startsWith("/articles/")) {
    return { detail: "article", page: "articles" };
  }

  if (path.startsWith("/posts/")) {
    return { detail: "post", page: "posts" };
  }

  if (path.startsWith("/inbox/")) {
    return { detail: "thread", page: "inbox" };
  }

  return { detail: null, page: null };
};

/**
 * The frame's navigation for a path (without its locale), in the
 * workspace, for a member with these permissions: the pages they may open,
 * the one open, its section, its mode, and where each mode starts.
 */
export const navigationOf = ({
  pathname,
  permissions,
  workspaceId,
}: {
  readonly pathname: string;
  readonly permissions: readonly Permission[];
  readonly workspaceId: string;
}): Navigation => {
  const may = new Set(permissions);
  const base = `/app/${workspaceId}`;
  const inside = pathname === base || pathname.startsWith(`${base}/`);
  const path = inside ? pathname.slice(base.length) : null;

  const { detail, page: current } =
    path === null ? { detail: null, page: null } : pageAt(path);

  const mode = current === null ? "studio" : pages[current].mode;
  const section = current === null ? null : (pages[current].section ?? null);
  const allowed = (page: Page): boolean => pages[page].may(may);

  const linkOf = (page: Page, opens: Section | null): Link => ({
    current: opens === null ? page === current : section === opens,
    href: hrefOf(workspaceId, page),
    opens,
    page,
  });

  const groups = layout[mode]
    .map(({ group, pages: listed }) => ({
      group,
      links: listed
        .filter(allowed)
        .map((page) => linkOf(page, page === "posts" ? "posts" : null)),
    }))
    .filter(({ links }) => links.length > 0);

  const sectionLinks =
    section === null
      ? []
      : sectionPages[section].filter(allowed).map((page) => linkOf(page, null));

  const firstOf = (of: Mode): string | null => {
    const page = layout[of]
      .flatMap(({ pages: listed }) => listed)
      .find(allowed);

    return page === undefined ? null : hrefOf(workspaceId, page);
  };

  return {
    breadcrumb: {
      page: detail ?? current,
      section: detail === null && current === "posts" ? null : section,
    },
    current,
    groups,
    mode,
    modes: { console: firstOf("console"), studio: firstOf("studio") },
    section,
    sectionLinks,
    settings: linkOf("general", "settings"),
  };
};
