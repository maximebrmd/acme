import { randomUUID } from "node:crypto";

import { describe, test } from "@e2e-dev/web";
import { credentials, expect } from "e2e";

import { confirmedAccount } from "./support/accounts.ts";
import { seedChannel } from "./support/channels.ts";

// The run's server bills (scripts/serve.ts): a new workspace is on the free
// tier, which allows two accounts. Connecting a third is refused, and the
// upgrade dialog offers per-account pricing at the rate card's price.
// Nothing is ordered: the test stops before checkout.
const run = randomUUID();
const name = "Robin Example";
const workspace = "Tide Tables";

const address = () =>
  credentials.user("member").username.replace("@", `+${run}-upgrade@`);

// This journey signs up through the API, so it must know the password:
// synthetic, like the address.
const password = "synthetic upgrade dialog password";

let workspaceId = "";

describe("the upgrade dialog", { serial: true }, () => {
  test("a member fills the free tier's accounts", async ({
    app,
    browser,
    screen,
  }) => {
    await confirmedAccount(app.baseUrl, {
      email: address(),
      name,
      password,
    });

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

    await expect(calendar).toBeVisible();

    const href = (await calendar.getAttribute("href")) ?? "";

    workspaceId =
      /^\/app\/(?<id>[^/]+)\/calendar$/u.exec(href)?.groups?.["id"] ?? "";
    expect(workspaceId).not.toBe("");

    await Promise.all(
      ["one", "two"].map(async (handle) => {
        await seedChannel(workspaceId, `@${handle}@social.example`);
      })
    );
  });

  test("a third account opens the upgrade dialog, with per-account pricing", async ({
    app,
    screen,
  }) => {
    await app.open(`/app/${workspaceId}/channels`);
    await screen.getByLabel("Server").fill("social.example");
    await screen.getByRole("button", "Connect Mastodon").tap();

    const dialog = screen.getByRole("dialog");

    await expect(
      dialog.getByRole("heading", "This plan has no room for another channel")
    ).toBeVisible();
    await expect(
      dialog.getByText(
        `The Free plan of ${workspace} allows 2 channels, and it has 2.`
      )
    ).toBeVisible();
    await expect(
      dialog.getByText(
        "The Per-account pricing plan has room: Unlimited channels"
      )
    ).toBeVisible();
    await expect(
      dialog.getByText(
        "$5.00 a month for each account past the first 2, excl. tax ($6.00 with 20% VAT), counted by the day; less each from account 11 on"
      )
    ).toBeVisible();
  });

  test("the order waits for the request to start at once, and is worded as an obligation to pay", async ({
    screen,
  }) => {
    const dialog = screen.getByRole("dialog");
    const order = dialog.getByRole("button", "Order with obligation to pay");

    await expect(order).toBeDisabled();
    await dialog
      .getByRole("checkbox", /^I ask Peal to start per-account pricing now/u)
      .check();
    await expect(order).toBeEnabled();

    // Monthly only: no period to choose.
    await expect(dialog.getByRole("button", "Yearly")).toBeHidden();

    await dialog.getByRole("button", "Not now").tap();
    await expect(screen.getByRole("dialog")).toBeHidden();
  });
});
