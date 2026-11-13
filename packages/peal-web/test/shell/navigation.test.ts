import { describe, expect, it } from "@effect/vitest";
import type { Permission } from "peal-contract";

import { navigationOf } from "#shell/navigation.ts";

const workspaceId = "00000000-0000-7000-8000-0000000000a1";
const base = `/app/${workspaceId}`;

const owner: readonly Permission[] = [
  "ads:read",
  "analytics:read",
  "apiKey:read",
  "assistant:configure",
  "billing:read",
  "channel:read",
  "engagement:read",
  "invitation:create",
  "partner:read",
  "post:create",
  "post:read",
  "post:schedule",
  "webhook:read",
];

const pagesOf = (navigation: ReturnType<typeof navigationOf>) =>
  navigation.groups.flatMap(({ links }) => links.map(({ page }) => page));

describe(navigationOf, () => {
  it("puts a Studio page in Studio, with the pages the member may open", () => {
    const navigation = navigationOf({
      pathname: `${base}/calendar`,
      permissions: owner,
      workspaceId,
    });

    expect(navigation.mode).toBe("studio");
    expect(navigation.current).toBe("calendar");
    expect(pagesOf(navigation)).toStrictEqual([
      "calendar",
      "posts",
      "channels",
      "media",
      "inbox",
      "analytics",
      "ads",
    ]);
    expect(navigation.groups.map(({ group }) => group)).toStrictEqual([
      null,
      "engage",
    ]);
    expect(navigation.breadcrumb).toStrictEqual({
      page: "calendar",
      section: null,
    });
  });

  it("leaves out what the member's permissions do not open", () => {
    const navigation = navigationOf({
      pathname: `${base}/calendar`,
      permissions: ["post:read"],
      workspaceId,
    });

    expect(pagesOf(navigation)).toStrictEqual([
      "calendar",
      "channels",
      "media",
    ]);
    expect(navigation.modes.console).toBeNull();
    expect(navigation.modes.studio).toBe(`${base}/calendar`);
  });

  it("puts the API's pages in Console, and starts Console at its first", () => {
    const navigation = navigationOf({
      pathname: `${base}/settings/webhooks`,
      permissions: owner,
      workspaceId,
    });

    expect(navigation.mode).toBe("console");
    expect(navigation.section).toBeNull();
    expect(pagesOf(navigation)).toStrictEqual([
      "apiKeys",
      "webhooks",
      "partner",
    ]);
    expect(navigation.modes.console).toBe(`${base}/settings/api-keys`);
  });

  it("opens the Posts section on its pages", () => {
    const draft = navigationOf({
      pathname: `${base}/drafts`,
      permissions: owner,
      workspaceId,
    });

    expect(draft.section).toBe("posts");
    expect(draft.sectionLinks.map(({ page }) => page)).toStrictEqual([
      "posts",
      "drafts",
      "approvals",
      "import",
    ]);
    expect(draft.sectionLinks.find(({ current }) => current)?.page).toBe(
      "drafts"
    );
    expect(draft.breadcrumb).toStrictEqual({
      page: "drafts",
      section: "posts",
    });
  });

  it("keeps a post's own pages under Posts, and names them", () => {
    const post = navigationOf({
      pathname: `${base}/posts/00000000-0000-7000-8000-0000000000b2`,
      permissions: owner,
      workspaceId,
    });

    expect(post.section).toBe("posts");
    expect(post.breadcrumb).toStrictEqual({ page: "post", section: "posts" });
    expect(
      navigationOf({
        pathname: `${base}/posts/new`,
        permissions: owner,
        workspaceId,
      }).breadcrumb
    ).toStrictEqual({ page: "newPost", section: "posts" });
    expect(
      navigationOf({
        pathname: `${base}/posts/import`,
        permissions: owner,
        workspaceId,
      }).current
    ).toBe("import");
  });

  it("opens the Settings section, marks Settings, and lists its pages by permission", () => {
    const navigation = navigationOf({
      pathname: `${base}/settings/tags`,
      permissions: ["post:read"],
      workspaceId,
    });

    expect(navigation.section).toBe("settings");
    expect(navigation.settings.current).toBeTruthy();
    expect(navigation.sectionLinks.map(({ page }) => page)).toStrictEqual([
      "general",
      "members",
      "security",
      "tags",
      "signatures",
      "recycling",
      "feeds",
    ]);
    expect(
      navigationOf({
        pathname: `${base}/billing`,
        permissions: owner,
        workspaceId,
      }).section
    ).toBe("settings");
  });

  it("names an inbox thread, and nothing on a page it does not list", () => {
    expect(
      navigationOf({
        pathname: `${base}/inbox/abc`,
        permissions: owner,
        workspaceId,
      }).breadcrumb
    ).toStrictEqual({ page: "thread", section: null });

    const elsewhere = navigationOf({
      pathname: `${base}/unknown`,
      permissions: owner,
      workspaceId,
    });

    expect(elsewhere.current).toBeNull();
    expect(elsewhere.mode).toBe("studio");
    expect(elsewhere.breadcrumb).toStrictEqual({ page: null, section: null });
  });
});
