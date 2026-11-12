import { randomUUID } from "node:crypto";

import { describe, test } from "@e2e-dev/web";
import type { Browser } from "@e2e-dev/web";
import { credentials, expect } from "e2e";
import type { Screen } from "e2e";

import { confirmedAccount, makeStaff } from "./support/accounts.ts";
import { seedChannel } from "./support/channels.ts";
import { seedComment, seedCountedPost } from "./support/followed.ts";

// A post of several parts, the numbers of a post that went live and the
// comments under it, as a member finds them; then as staff acting for the
// member, who read the numbers and no comment. No platform is reached in a
// run: the post that "went live" is seeded as analytics and the inbox keep
// it, and nothing is sent. The module loads again for each attempt, so a
// retry uses new addresses.
const run = randomUUID();
const name = "Noor Example";
const staffName = "Robin Staff";
const workspace = "Tide Pools";
const handle = "@pools@social.example";
const first = "A synthetic thread, first part: what we found at low tide.";
const second = "Second part: the anemones, with a wait before it.";
const commenter = "A Synthetic Reader";
const comment = "A synthetic comment: which beach was it?";

const addressOf = (label: string) =>
  credentials.user("member").username.replace("@", `+${run}-${label}@`);

// These accounts sign up through the API, whose password the journey must
// know: synthetic, like their addresses.
const password = "synthetic threads and inbox password";

let workspaceId = "";

const signIn = async (
  app: { readonly open: (path: string) => Promise<void> },
  browser: Browser,
  screen: Screen,
  email: string
) => {
  await browser.clearCookies();
  await app.open("/sign-in");
  await screen.getByLabel("Email").fill(email);
  await screen.getByLabel("Password").fill(password);
  await screen.getByRole("main").getByRole("button", "Sign in").tap();
};

describe("threads, analytics and the inbox", { serial: true }, () => {
  test("a member writes a post of two parts and keeps it as a draft", async ({
    app,
    browser,
    screen,
  }) => {
    await confirmedAccount(app.baseUrl, {
      email: addressOf("author"),
      name,
      password,
    });

    await signIn(app, browser, screen, addressOf("author"));
    await screen.getByLabel("Workspace name").fill(workspace);
    await screen.getByRole("button", "Create the workspace").tap();

    const calendar = screen
      .getByRole("navigation", `Posts of ${workspace}`)
      .getByRole("link", "Calendar");

    await expect(calendar).toBeVisible();

    const href = (await calendar.getAttribute("href")) ?? "";

    workspaceId =
      /^\/app\/(?<id>[^/]+)\/calendar$/u.exec(href)?.groups?.["id"] ?? "";
    expect(workspaceId).not.toBe("");

    await seedChannel(workspaceId, handle);
    await app.open(`/app/${workspaceId}/posts/new`);

    await expect(screen.getByRole("heading", "New post")).toBeVisible();
    await screen.getByRole("checkbox", handle).check();
    await screen.getByRole("textbox", "Text for all channels").fill(first);

    const thread = screen.getByRole("region", "Thread");

    await thread.getByRole("button", "Add a part").tap();
    await thread.getByRole("textbox", "Part 2").fill(second);
    await screen.getByRole("button", "Save as draft").tap();

    await expect(screen.getByText("Draft saved.")).toBeVisible();
    await expect(browser).toHaveURL(
      new RegExp(`/app/${workspaceId}/posts/[0-9a-f-]+$`, "u")
    );

    // The draft comes back whole: both parts, in order.
    await browser.reload();

    await expect(screen.getByRole("heading", "Edit the draft")).toBeVisible();
    await expect(
      screen.getByRole("textbox", "Text for all channels")
    ).toHaveText(first);
    await expect(
      screen.getByRole("region", "Thread").getByRole("textbox", "Part 2")
    ).toHaveText(second);

    // Nothing goes out: the draft is discarded.
    await screen.getByRole("button", "Discard the draft").tap();
    await screen
      .getByRole("dialog", "Discard this draft?")
      .getByRole("button", "Discard the draft")
      .tap();
    await expect(screen.getByText("Draft discarded.")).toBeVisible();
  });

  test("reads the numbers of a post that went live", async ({
    app,
    browser,
    screen,
  }) => {
    await seedCountedPost(workspaceId, handle, { likes: 12, reposts: 3 });
    await app.open("/app");
    await screen
      .getByRole("navigation", `Posts of ${workspace}`)
      .getByRole("link", `Analytics of ${workspace}`)
      .tap();

    await expect(
      screen.getByRole("heading", "Analytics", { level: 1 })
    ).toBeVisible();
    await expect(browser).toHaveURL(`/app/${workspaceId}/analytics`);

    // The channel's latest counts, as a table anyone can read.
    const totals = screen.getByRole(
      "table",
      "The latest counts of the range’s posts, by channel"
    );

    await expect(totals).toBeVisible();
    await expect(
      totals.getByRole("rowheader", /@pools@social\.example/u)
    ).toBeVisible();
    await expect(
      screen.getByText(
        "No post went out in this range yet on a platform Peal reads counts on."
      )
    ).toBeHidden();

    // And the same numbers as files.
    const exports = screen.getByRole("region", "Export");

    await expect(
      exports.getByRole("button", "Posts of the range")
    ).toBeVisible();
    await expect(
      exports.getByRole("button", "Accounts, day by day")
    ).toBeVisible();
  });

  test("reads a comment in the inbox and settles it", async ({
    app,
    browser,
    screen,
  }) => {
    await seedComment(workspaceId, handle, {
      author: commenter,
      text: comment,
    });
    await app.open("/app");
    await screen
      .getByRole("navigation", `Posts of ${workspace}`)
      .getByRole("link", `Inbox of ${workspace}`)
      .tap();

    await expect(
      screen.getByRole("heading", "Inbox", { level: 1 })
    ).toBeVisible();
    await expect(browser).toHaveURL(`/app/${workspaceId}/inbox`);

    // The list holds counts, not what people wrote.
    await expect(screen.getByText("1 waiting of 1")).toBeVisible();
    await expect(screen.getByText(comment)).toBeHidden();

    await screen
      .getByRole("main")
      .getByRole("link", /^Comments under the post on /u)
      .tap();

    await expect(
      screen.getByRole("heading", "Comments", { level: 1 })
    ).toBeVisible();
    await expect(screen.getByText(comment)).toBeVisible();
    await expect(screen.getByText(commenter)).toBeVisible();

    // The account may answer: the box says who will read the reply.
    await expect(
      screen.getByText(
        "Everyone who sees the post sees the reply, sent as the channel’s account."
      )
    ).toBeVisible();

    // Settled without a reply: nothing is sent to any platform.
    await screen.getByRole("button", "Mark as answered").tap();

    await expect(
      screen.getByText("The comment is marked as answered.")
    ).toBeVisible();
    await expect(screen.getByRole("button", "Mark as waiting")).toBeVisible();
    await expect(screen.getByText("0 waiting of 1")).toBeVisible();
  });

  test("lets staff acting as the member read the numbers, and no comment", async ({
    app,
    browser,
    screen,
  }) => {
    await confirmedAccount(app.baseUrl, {
      email: addressOf("staff"),
      name: staffName,
      password,
    });
    await makeStaff(addressOf("staff"));
    await signIn(app, browser, screen, addressOf("staff"));
    await expect(
      screen.getByRole("heading", `Hello, ${staffName}`)
    ).toBeVisible();

    await app.open("/admin/users");
    await screen.getByLabel("Email, name or id").fill(addressOf("author"));
    await screen.getByRole("button", "Search").tap();
    await screen.getByRole("main").getByRole("link", name).tap();

    // The page arrives from the server before it hydrates: the button is
    // disabled until it opens its confirmation.
    const actAs = screen
      .getByRole("main")
      .getByRole("button", "Act as this account");

    await expect(actAs).toBeEnabled();
    await actAs.tap();

    const dialog = screen.getByRole("alertdialog", `Act as ${name}?`);

    await expect(dialog).toBeVisible();
    await dialog.getByRole("textbox", "Why").fill("Synthetic support request");
    await dialog.getByRole("button", "Act as the account").tap();

    await expect(screen.getByRole("heading", `Hello, ${name}`)).toBeVisible();

    const banner = screen.getByRole("region", "Acting as another account");

    await expect(banner).toBeVisible();

    // The numbers are the workspace's own; the comments are other
    // people's words, which staff need none of to help a member.
    const links = screen.getByRole("navigation", `Posts of ${workspace}`);

    await expect(
      links.getByRole("link", `Analytics of ${workspace}`)
    ).toBeVisible();
    await expect(links.getByRole("link", `Inbox of ${workspace}`)).toBeHidden();

    await app.open(`/app/${workspaceId}/analytics`);
    await expect(
      screen.getByRole("heading", "Analytics", { level: 1 })
    ).toBeVisible();

    await app.open(`/app/${workspaceId}/inbox`);
    await expect(screen.getByRole("heading", "Page not found")).toBeVisible();
    await expect(screen.getByText(comment)).toBeHidden();

    await banner.getByRole("button", "Stop acting as them").tap();
    await expect(
      screen.getByRole("region", "Acting as another account")
    ).toBeHidden();
  });
});
