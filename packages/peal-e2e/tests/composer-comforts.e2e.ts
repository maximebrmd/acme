import { randomUUID } from "node:crypto";

import { describe, test } from "@e2e-dev/web";
import { credentials, expect } from "e2e";

import { seedChannel } from "./support/channels.ts";
import { emailedLink } from "./support/mailpit.ts";

// The composer's comforts, in one browser: each test starts where the
// previous one left off. Nothing goes out: "Publish now" is opened and
// left, and the draft is discarded at the end. The module loads again for
// each attempt, so a retry signs up under a new address.
const run = randomUUID();
const name = "Kim Example";
const workspace = "Comfort Notes";

const handles = [
  "@comfort_one@social.example",
  "@comfort_two@social.example",
  "@comfort_three@social.example",
] as const;

const text = "A field note written with every comfort.";

const address = () =>
  credentials.user("member").username.replace("@", `+${run}-comforts@`);

const guest = () =>
  credentials.user("member").username.replace("@", `+${run}-comforts-guest@`);

const password = () => credentials.user("member").password;

let workspaceId = "";

describe("the composer's comforts", { serial: true }, () => {
  test("signs up and makes a workspace with three channels", async ({
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

    await Promise.all(
      handles.map(async (handle) => {
        await seedChannel(workspaceId, handle);
      })
    );
  });

  test("selects every channel, then none", async ({ app, screen }) => {
    await app.open(`/app/${workspaceId}/posts/new`);
    await expect(screen.getByRole("heading", "New post")).toBeVisible();

    await screen.getByRole("button", "Select all").tap();

    await Promise.all(
      handles.map(async (handle) => {
        await expect(screen.getByRole("checkbox", handle)).toBeChecked();
      })
    );

    await screen.getByRole("button", "Clear").tap();

    await Promise.all(
      handles.map(async (handle) => {
        await expect(screen.getByRole("checkbox", handle)).not.toBeChecked();
      })
    );
  });

  test("inserts an emoji where the text was being written", async ({
    screen,
  }) => {
    const textbox = screen.getByRole("textbox", "Text for all channels");

    await textbox.fill(text);
    await screen.getByRole("button", "Insert an emoji").tap();
    await screen.getByRole("searchbox", "Search emoji").fill("rocket");
    await screen.getByRole("gridcell", "Rocket").tap();

    await expect(textbox).toHaveText(`${text}🚀`);
  });

  test("previews what each channel will receive", async ({ screen }) => {
    await screen.getByRole("button", "Select all").tap();

    const previews = screen.getByRole("region", "Previews");

    // Asked a second after the last change, from the server's own check.
    await expect(previews.getByText(`${text}🚀`)).toHaveCount(handles.length);
    await expect(
      previews.getByText("Each platform lays the post out its own way.", {
        exact: false,
      })
    ).toBeVisible();
  });

  test("asks before publishing now, naming the channels", async ({
    screen,
  }) => {
    await screen.getByRole("button", "Publish now").tap();

    const dialog = screen.getByRole("dialog", "Publish this post now?");

    await expect(
      dialog.getByText(
        "It goes out at once and is public on these 3 channels.",
        {
          exact: false,
        }
      )
    ).toBeVisible();

    await Promise.all(
      handles.map(async (handle) => {
        await expect(dialog.getByText(handle)).toBeVisible();
      })
    );

    // Nothing goes out in a run.
    await dialog.getByRole("button", "Not now").tap();
    // A modal dialog swallows presses while it animates out, so a press
    // that closed it cannot land on the page: wait until it is gone.
    await expect(dialog).toBeHidden();
    await screen.getByRole("button", "Save as draft").tap();
    await expect(screen.getByText("Draft saved.")).toBeVisible();
  });

  test("finds the draft among all posts, and filters it out", async ({
    app,
    browser,
    screen,
  }) => {
    await app.open("/app");
    await screen
      .getByRole("navigation", `Posts of ${workspace}`)
      .getByRole("link", "All posts")
      .tap();

    await expect(
      screen.getByRole("heading", "All posts", { level: 1 })
    ).toBeVisible();
    await expect(
      screen.getByRole("main").getByRole("link", `${text}🚀`)
    ).toBeVisible();

    await screen.getByRole("combobox", "Status").tap();
    await screen.getByRole("option", "Scheduled").tap();

    await expect(browser).toHaveURL(
      `/app/${workspaceId}/posts?status=scheduled`
    );
    await expect(
      screen.getByText("No post matches these filters.")
    ).toBeVisible();

    await screen.getByRole("link", "Clear the filters").tap();
    await expect(
      screen.getByRole("main").getByRole("link", `${text}🚀`)
    ).toBeVisible();
  });

  test("discards the draft", async ({ screen }) => {
    await screen.getByRole("main").getByRole("link", `${text}🚀`).tap();
    await expect(screen.getByRole("heading", "Edit the draft")).toBeVisible();
    await screen.getByRole("button", "Discard the draft").tap();
    await screen
      .getByRole("dialog", "Discard this draft?")
      .getByRole("button", "Discard the draft")
      .tap();
    await expect(screen.getByText("Draft discarded.")).toBeVisible();
  });

  test("offers a pending invitation's link, for the invited address only", async ({
    app,
    screen,
  }) => {
    await app.open(`/app/${workspaceId}/settings/invitations`);
    await screen.getByLabel("Email").fill(guest());
    await screen.getByRole("button", "Send the invitation").tap();

    await expect(
      screen.getByRole("button", `Copy the invitation link for ${guest()}`)
    ).toBeVisible();
    await expect(
      screen.getByText("only the person invited can accept it", {
        exact: false,
      })
    ).toBeVisible();
  });
});
