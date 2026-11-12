import { randomUUID } from "node:crypto";

import { describe, test } from "@e2e-dev/web";
import { credentials, expect } from "e2e";

import { confirmedAccount } from "./support/accounts.ts";
import { seedChannel } from "./support/channels.ts";

// An owner asks that every post waits for an approval, writes one, and
// sends a reviewer without an account a link: the reviewer comments and
// approves, the post is scheduled, and the link stops working once the
// post is cancelled. The module loads again for each attempt, so a retry
// signs up under a new address.
const run = randomUUID();
const name = "Robin Owner";
const reviewer = "Ada Reviewer";
const workspace = "Review Studio";
const handle = "@review@social.example";
const text = "A synthetic post a client approves before it goes out.";
const remark = "<b>Friday</b> works for us.";

const address = () =>
  credentials.user("member").username.replace("@", `+${run}-review@`);

// The account this journey signs up through the API, whose password it
// must know: synthetic, like its address.
const password = "synthetic review link password";

let workspaceId = "";

// The link the owner copies, which the reviewer opens.
let link = "";

// The post's page in the app.
let postPage = "";

describe("a review link", { serial: true }, () => {
  test("starts with a workspace where every post waits", async ({
    app,
    browser,
    screen,
  }) => {
    await confirmedAccount(app.baseUrl, { email: address(), name, password });
    await browser.clearCookies();
    await app.open("/sign-in");
    await screen.getByLabel("Email").fill(address());
    await screen.getByLabel("Password").fill(password);
    await screen.getByRole("main").getByRole("button", "Sign in").tap();
    await screen.getByLabel("Workspace name").fill(workspace);
    await screen.getByRole("button", "Create the workspace").tap();

    const calendar = screen
      .getByRole("navigation", `Posts of ${workspace}`)
      .getByRole("link", "Calendar");

    const href = (await calendar.getAttribute("href")) ?? "";

    workspaceId =
      /^\/app\/(?<id>[^/]+)\/calendar$/u.exec(href)?.groups?.["id"] ?? "";
    expect(workspaceId).not.toBe("");

    await seedChannel(workspaceId, handle);
    await app.open(`/app/${workspaceId}/settings`);
    await screen.getByRole("radio", "Always").check();
    await screen.getByRole("main").getByRole("button", "Save").tap();

    await expect(
      screen.getByText(
        "Approval setting saved. It applies to posts scheduled from now on."
      )
    ).toBeVisible();
  });

  test("asks for an approval instead of scheduling", async ({
    app,
    screen,
  }) => {
    await app.open(`/app/${workspaceId}/posts/new`);
    await screen.getByRole("checkbox", handle).check();
    await screen.getByRole("textbox", "Text for all channels").fill(text);
    await screen.getByRole("textbox", "Time").fill("23:59");
    await screen.getByRole("button", "Ask for approval").tap();

    // Sent, then the calendar renders on the server: longer than an
    // assertion's 5 seconds on a loaded machine.
    await expect(screen.getByRole("heading", "Calendar")).toBeVisible({
      timeout: 30_000,
    });

    const waiting = screen.getByRole(
      "link",
      new RegExp(`, Awaiting approval: ${RegExp.escape(text)}$`, "u")
    );

    postPage = (await waiting.getAttribute("href")) ?? "";
    expect(postPage).toContain(`/app/${workspaceId}/posts/`);

    await waiting.tap();
    await expect(
      screen.getByRole("heading", "Post awaiting approval")
    ).toBeVisible();

    // It also shows under "Needs approval".
    await app.open(`/app/${workspaceId}/approvals`);
    await expect(screen.getByRole("heading", "Needs approval")).toBeVisible();
    await expect(
      screen.getByRole("main").getByRole("link", "Open the post")
    ).toBeVisible();
  });

  test("makes a link that lets its holder approve", async ({ app, screen }) => {
    await app.open(postPage);
    await screen.getByRole("combobox", "Whoever opens it may").tap();
    await screen.getByRole("option", "View, comment and approve").tap();
    await screen.getByRole("button", "Create a link").tap();

    await expect(screen.getByText("Copy this link now")).toBeVisible();

    link = (await screen.getByText(/\/review#[\w-]{43}$/u).textContent()) ?? "";
    expect(link).toContain("/review#");
  });

  test("shows the post to a reviewer without an account, who comments and approves", async ({
    browser,
    screen,
  }) => {
    await browser.clearCookies();
    await browser.goto(link);

    await expect(screen.getByRole("heading", "Review a post")).toBeVisible();
    await expect(screen.getByText(handle)).toBeVisible();
    await expect(screen.getByRole("main").getByText(text)).toBeVisible();
    await expect(
      screen.getByText(/^This post waits for an approval\./u)
    ).toBeVisible();

    await screen.getByRole("textbox", "Your name").fill(reviewer);
    await screen.getByRole("textbox", "Your comment").fill(remark);
    await screen.getByRole("button", "Comment").tap();

    // What the reviewer typed is shown as the text it is.
    await expect(screen.getByText(remark)).toBeVisible();

    await screen.getByRole("button", "Approve this post").tap();

    await expect(
      screen.getByText("Thank you: the post is approved, and scheduled.")
    ).toBeVisible();
  });

  test("schedules the post, and records who approved it", async ({
    app,
    browser,
    screen,
  }) => {
    await app.open("/sign-in");
    await screen.getByLabel("Email").fill(address());
    await screen.getByLabel("Password").fill(password);
    await screen.getByRole("main").getByRole("button", "Sign in").tap();
    await expect(screen.getByRole("heading", `Hello, ${name}`)).toBeVisible();
    await app.open(postPage);

    await expect(screen.getByRole("heading", "Scheduled post")).toBeVisible();
    await expect(
      screen.getByText(
        new RegExp(`^Decided by ${reviewer}, through a review link, on `, "u")
      )
    ).toBeVisible();
    await expect(screen.getByText(remark)).toBeVisible();

    // Nothing goes out: the post is cancelled, and its link says so.
    await screen.getByRole("button", "Cancel the post").tap();
    await screen
      .getByRole("dialog", "Cancel this post?")
      .getByRole("button", "Cancel the post")
      .tap();
    await expect(screen.getByText("Post cancelled.")).toBeVisible();

    await browser.clearCookies();
    await browser.goto(link);

    await expect(screen.getByText("This link no longer works")).toBeVisible();
    await expect(
      screen.getByText("The post was cancelled: it will not be published.")
    ).toBeVisible();
  });
});
