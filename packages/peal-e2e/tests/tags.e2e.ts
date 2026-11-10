import { randomUUID } from "node:crypto";

import { describe, test } from "@e2e-dev/web";
import { credentials, expect } from "e2e";

import { seedChannel } from "./support/channels.ts";
import { emailedLink } from "./support/mailpit.ts";

// A member files a post under a tag, then filters the calendar by it, in
// one browser: each test starts where the previous one left off. The module
// loads again for each attempt, so a retry signs up under a new address.
const run = randomUUID();
const name = "Robin Example";
const workspace = "Tagged Notes";
const handle = "@tagged@social.example";
const tag = "Spring campaign";
const tagged = "A field note filed under the spring campaign.";
const plain = "A field note filed under nothing.";

// The calendar names each post "<time>, <status>: <text>", then its tags.
const taggedPost = new RegExp(
  `, Scheduled: ${RegExp.escape(tagged)} Tag: ${RegExp.escape(tag)}\\.$`,
  "u"
);

const plainPost = new RegExp(`, Scheduled: ${RegExp.escape(plain)}$`, "u");

// The member account from e2e.config.ts, under an address of this run.
const address = () =>
  credentials.user("member").username.replace("@", `+${run}-tags@`);

const password = () => credentials.user("member").password;

// The workspace's pages live under /app/<id>; the test that creates it reads
// the id from its links.
let workspaceId = "";

describe("a member's tags", { serial: true }, () => {
  test("signs up and confirms the address", async ({
    app,
    browser,
    screen,
  }) => {
    await app.open("/sign-up");
    await screen.getByLabel("Name").fill(name);
    await screen.getByLabel("Email").fill(address());
    await screen.getByLabel("Password").fill(password());
    await screen.getByRole("button", "Create my account").tap();
    await expect(screen.getByText("Check your inbox")).toBeVisible();

    // The confirmation link signs the member in.
    await browser.goto(
      await emailedLink(address(), "Confirm your email for Peal")
    );

    await expect(screen.getByRole("heading", "Email confirmed")).toBeVisible();
  });

  test("creates a workspace", async ({ app, screen }) => {
    await app.open("/app");
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
  });

  test("adds a tag in the workspace's settings", async ({ app, screen }) => {
    await seedChannel(workspaceId, handle);
    await app.open(`/app/${workspaceId}/settings`);
    await screen
      .getByRole("navigation", "Workspace settings")
      .getByRole("link", "Tags")
      .tap();

    await expect(
      screen.getByText("The workspace has no tag yet.")
    ).toBeVisible();

    await screen.getByLabel("Name").fill(tag);
    await screen.getByRole("button", "Add the tag").tap();

    await expect(screen.getByText("The tag is added.")).toBeVisible();
  });

  test("schedules a post filed under the tag", async ({ app, screen }) => {
    await app.open(`/app/${workspaceId}/posts/new`);

    await expect(screen.getByRole("heading", "New post")).toBeVisible();
    await screen.getByRole("checkbox", handle).check();
    await screen.getByRole("textbox", "Text for all channels").fill(tagged);

    await screen.getByRole("button", "Choose tags").tap();
    await screen.getByRole("checkbox", tag).check();
    await screen.getByRole("checkbox", tag).press("Escape");

    // Late in the day, so the time is ahead whenever the test runs.
    await screen.getByRole("textbox", "Time").fill("23:59");
    await screen.getByRole("button", "Schedule").tap();

    await expect(screen.getByRole("heading", "Calendar")).toBeVisible();
    await expect(screen.getByRole("link", taggedPost)).toBeVisible();
  });

  test("schedules a post without a tag", async ({ app, screen }) => {
    await app.open(`/app/${workspaceId}/posts/new`);

    await expect(screen.getByRole("heading", "New post")).toBeVisible();
    await screen.getByRole("checkbox", handle).check();
    await screen.getByRole("textbox", "Text for all channels").fill(plain);
    await screen.getByRole("textbox", "Time").fill("23:58");
    await screen.getByRole("button", "Schedule").tap();

    await expect(screen.getByRole("heading", "Calendar")).toBeVisible();
    await expect(screen.getByRole("link", plainPost)).toBeVisible();
    await expect(screen.getByRole("link", taggedPost)).toBeVisible();
  });

  test("filters the calendar by the tag", async ({ screen }) => {
    await screen.getByRole("button", "Tags").tap();
    await screen.getByRole("menuitemcheckbox", tag).tap();
    // The menu stays open for more choices: close it to read the calendar.
    await screen.getByRole("menuitemcheckbox", tag).press("Escape");

    await expect(screen.getByRole("button", "Tags (1)")).toBeVisible();
    await expect(screen.getByRole("link", taggedPost)).toBeVisible();
    await expect(screen.getByRole("link", plainPost)).toBeHidden();
    await expect(screen.getByText("1 post hidden by filters")).toBeVisible();
  });

  test("shows every post again once the filters are cleared", async ({
    screen,
  }) => {
    await screen.getByRole("button", "Clear filters").tap();

    await expect(screen.getByRole("link", taggedPost)).toBeVisible();
    await expect(screen.getByRole("link", plainPost)).toBeVisible();
    await expect(screen.getByText("1 post hidden by filters")).toBeHidden();
    await expect(screen.getByRole("button", "Clear filters")).toBeHidden();
  });

  // Nothing goes out: both posts are cancelled.
  test("cancels the tagged post", async ({ screen }) => {
    await screen.getByRole("link", taggedPost).tap();
    await expect(screen.getByRole("heading", "Scheduled post")).toBeVisible();
    await screen.getByRole("button", "Cancel the post").tap();
    await screen
      .getByRole("dialog", "Cancel this post?")
      .getByRole("button", "Cancel the post")
      .tap();

    await expect(screen.getByText("Post cancelled.")).toBeVisible();
    await expect(screen.getByRole("heading", "Calendar")).toBeVisible();
    // The next test cancels a post too: its toast must be the only one.
    await expect(screen.getByText("Post cancelled.")).toBeHidden({
      timeout: 10_000,
    });
  });

  test("cancels the other post", async ({ screen }) => {
    await screen.getByRole("link", plainPost).tap();
    await expect(screen.getByRole("heading", "Scheduled post")).toBeVisible();
    await screen.getByRole("button", "Cancel the post").tap();
    await screen
      .getByRole("dialog", "Cancel this post?")
      .getByRole("button", "Cancel the post")
      .tap();

    await expect(screen.getByText("Post cancelled.")).toBeVisible();
    await expect(screen.getByRole("heading", "Calendar")).toBeVisible();
    await expect(screen.getByRole("link", plainPost)).toBeHidden();
  });
});
