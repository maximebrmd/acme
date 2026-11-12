import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { describe, test } from "@e2e-dev/web";
import { credentials, expect } from "e2e";

import { seedChannel } from "./support/channels.ts";
import { emailedLink } from "./support/mailpit.ts";

// A member imports posts from a CSV file, in one browser: a file whose
// row names a channel the workspace does not have is refused, with nothing
// to import; a file of one row next year is checked, imported, and its post
// cancelled, so nothing goes out. The module loads again for each attempt,
// so a retry signs up under a new address.
const run = randomUUID();
const name = "Kim Example";
const workspace = "Imported Notes";
const handle = "@imported@social.example";
const text = "A field note scheduled from a file.";

const address = () =>
  credentials.user("member").username.replace("@", `+${run}-import@`);

const password = () => credentials.user("member").password;

// The files the run writes, under the ignored output folder.
const files = path.join(import.meta.dirname, "..", ".e2e", "csv-import");

const csvFile = async (file: string, rows: readonly string[]) => {
  const written = path.join(files, `${run}-${file}`);

  await mkdir(files, { recursive: true });
  await writeFile(
    written,
    ["text,channels,at,time_zone", ...rows, ""].join("\n")
  );

  return written;
};

// Next year, so the row is never in the past whenever the test runs.
const nextYear = String(new Date().getUTCFullYear() + 1);

let workspaceId = "";

describe("a member's CSV import", { serial: true }, () => {
  test("signs up and creates a workspace", async ({ app, browser, screen }) => {
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

    await expect(calendar).toBeVisible({ timeout: 30_000 });

    const href = (await calendar.getAttribute("href")) ?? "";

    workspaceId =
      /^\/app\/(?<id>[^/]+)\/calendar$/u.exec(href)?.groups?.["id"] ?? "";
    expect(workspaceId).not.toBe("");
  });

  test("opens the import from All posts", async ({ app, browser, screen }) => {
    await app.open(`/app/${workspaceId}/posts`);
    await screen
      .getByRole("main")
      .getByRole("link", "Import from a file")
      .tap();

    await expect(screen.getByRole("heading", "Import posts")).toBeVisible();
    await expect(browser).toHaveURL(`/app/${workspaceId}/posts/import`);
    await expect(
      screen.getByText(
        "No channel is connected yet: connect one before importing."
      )
    ).toBeVisible();
  });

  test("refuses a row whose channel is not the workspace's", async ({
    screen,
  }) => {
    const unknown = "00000000-0000-7000-8000-00000000dead";

    await screen
      .getByLabel("CSV file")
      .setInputFiles(await csvFile("unknown.csv", [`${text},${unknown},now,`]));

    await expect(
      screen.getByText(`These channels are not the workspace’s: ${unknown}.`, {
        exact: false,
      })
    ).toBeVisible();
    await expect(
      screen.getByText("1 row cannot be made, so nothing will be made.", {
        exact: false,
      })
    ).toBeVisible();
    await expect(screen.getByRole("button", "Import 1 post")).toBeHidden();
  });

  test("checks a valid file and imports it", async ({ app, screen }) => {
    const channelId = await seedChannel(workspaceId, handle);

    await app.open(`/app/${workspaceId}/posts/import`);
    await expect(screen.getByText(channelId)).toBeVisible();

    await screen
      .getByLabel("CSV file")
      .setInputFiles(
        await csvFile("valid.csv", [
          `${text},${channelId},${nextYear}-03-02 09:00,Europe/Paris`,
        ])
      );

    await expect(
      screen.getByText("The row is valid.", { exact: false })
    ).toBeVisible();

    await screen.getByRole("button", "Import 1 post").tap();
    await screen
      .getByRole("dialog", "Import these posts?")
      .getByRole("button", "Import")
      .tap();

    await expect(screen.getByText("1 post was made.")).toBeVisible();
    await expect(screen.getByRole("link", "Open the post")).toBeVisible();
  });

  // Nothing goes out: the imported post is cancelled.
  test("cancels the imported post", async ({ screen }) => {
    await screen.getByRole("link", "Open the post").tap();
    await expect(screen.getByRole("heading", "Scheduled post")).toBeVisible();
    await screen.getByRole("button", "Cancel the post").tap();
    await screen
      .getByRole("dialog", "Cancel this post?")
      .getByRole("button", "Cancel the post")
      .tap();

    await expect(screen.getByText("Post cancelled.")).toBeVisible();
  });
});
