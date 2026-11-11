import { randomUUID } from "node:crypto";

import { describe, test } from "@e2e-dev/web";
import { credentials, expect } from "e2e";

import { seedChannel } from "./support/channels.ts";
import { emailedLink } from "./support/mailpit.ts";

// A member makes a queue, adds two posts to it, and sees them take its two
// slots one after the other, in one browser: each test starts where the
// previous one left off. The module loads again for each attempt, so a
// retry signs up under a new address.
const run = randomUUID();
const name = "Robin Example";
const workspace = "Queued Notes";
const handle = "@queued@social.example";
const queue = "Evenings";
const first = "A field note for the first slot.";
const second = "A field note for the next slot.";

// Today, as the queue's day: its slots are late in the day, so they are
// ahead whenever the test runs.
const today = new Date().toLocaleDateString("en-US", { weekday: "long" });

const postNamed = (text: string) =>
  new RegExp(`, Scheduled: ${RegExp.escape(text)}$`, "u");

const address = () =>
  credentials.user("member").username.replace("@", `+${run}-queues@`);

const password = () => credentials.user("member").password;

let workspaceId = "";

describe("a member's queue", { serial: true }, () => {
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

  test("adds a queue of two slots in the workspace's settings", async ({
    app,
    screen,
  }) => {
    await seedChannel(workspaceId, handle);
    await app.open(`/app/${workspaceId}/settings`);
    await screen
      .getByRole("navigation", "Workspace settings")
      .getByRole("link", "Queues")
      .tap();

    await expect(
      screen.getByText("The workspace has no queue yet.")
    ).toBeVisible();

    await screen.getByLabel("Name").fill(queue);

    await screen.getByRole("combobox", "Day").tap();
    await screen.getByRole("option", today).tap();
    await screen.getByRole("textbox", "Time").fill("23:57");
    await screen.getByRole("button", "Add the slot").tap();

    await screen.getByRole("combobox", "Day").tap();
    await screen.getByRole("option", today).tap();
    await screen.getByRole("textbox", "Time").fill("23:58");
    await screen.getByRole("button", "Add the slot").tap();

    await screen.getByRole("checkbox", `${handle} on Mastodon`).check();
    await screen.getByRole("button", "Add the queue").tap();

    await expect(screen.getByText("The queue is added.")).toBeVisible();
  });

  test("adds a post to the queue's first slot", async ({ app, screen }) => {
    await app.open(`/app/${workspaceId}/posts/new`);

    await expect(screen.getByRole("heading", "New post")).toBeVisible();
    await screen.getByRole("checkbox", handle).check();
    await screen.getByRole("textbox", "Text for all channels").fill(first);
    await screen.getByRole("tab", "Add to queue").tap();
    await expect(screen.getByText(/^Next free slot: /u)).toBeVisible();
    await screen.getByRole("button", "Schedule").tap();

    await expect(
      screen.getByText(/Added to the queue: it goes out .*11:57/u)
    ).toBeVisible();
    await expect(screen.getByRole("heading", "Calendar")).toBeVisible();
    await expect(screen.getByRole("link", postNamed(first))).toBeVisible();
  });

  test("adds another post, which takes the next slot", async ({
    app,
    screen,
  }) => {
    await app.open(`/app/${workspaceId}/posts/new`);

    await expect(screen.getByRole("heading", "New post")).toBeVisible();
    await screen.getByRole("checkbox", handle).check();
    await screen.getByRole("textbox", "Text for all channels").fill(second);
    await screen.getByRole("tab", "Add to queue").tap();
    await screen.getByRole("button", "Schedule").tap();

    await expect(
      screen.getByText(/Added to the queue: it goes out .*11:58/u)
    ).toBeVisible();
    await expect(screen.getByRole("link", postNamed(second))).toBeVisible();
    await expect(screen.getByRole("link", postNamed(first))).toBeVisible();
  });

  // Nothing goes out: both posts are cancelled.
  test("cancels both posts", async ({ screen }) => {
    await screen.getByRole("link", postNamed(first)).tap();
    await expect(screen.getByRole("heading", "Scheduled post")).toBeVisible();
    await expect(screen.getByText(`Queue: ${queue}`)).toBeVisible();
    await screen.getByRole("button", "Cancel the post").tap();
    await screen
      .getByRole("dialog", "Cancel this post?")
      .getByRole("button", "Cancel the post")
      .tap();

    await expect(screen.getByText("Post cancelled.")).toBeVisible();
    await expect(screen.getByRole("heading", "Calendar")).toBeVisible();
    await expect(screen.getByText("Post cancelled.")).toBeHidden({
      timeout: 10_000,
    });

    await screen.getByRole("link", postNamed(second)).tap();
    await expect(screen.getByRole("heading", "Scheduled post")).toBeVisible();
    await expect(screen.getByText(`Queue: ${queue}`)).toBeVisible();
    await screen.getByRole("button", "Cancel the post").tap();
    await screen
      .getByRole("dialog", "Cancel this post?")
      .getByRole("button", "Cancel the post")
      .tap();

    await expect(screen.getByText("Post cancelled.")).toBeVisible();
    await expect(screen.getByRole("heading", "Calendar")).toBeVisible();
    await expect(screen.getByText("Post cancelled.")).toBeHidden({
      timeout: 10_000,
    });
  });
});
