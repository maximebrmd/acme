import { randomUUID } from "node:crypto";

import { describe, test } from "@e2e-dev/web";
import { credentials, expect } from "e2e";

import { confirmedAccount } from "./support/accounts.ts";
import { seedChannel } from "./support/channels.ts";

// The run's server bills (scripts/serve.ts): a new workspace is on the free
// plan, which allows three channels. Connecting a fourth is refused, and
// the upgrade dialog offers the smallest plan with room. Nothing is ordered:
// the test stops before checkout.
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
  test("a member fills the free plan's channels", async ({
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
      ["one", "two", "three"].map(async (handle) => {
        await seedChannel(workspaceId, `@${handle}@social.example`);
      })
    );
  });

  test("a fourth channel opens the upgrade dialog, with the plan that has room", async ({
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
        `The Free plan of ${workspace} allows 3 channels, and it has 3.`
      )
    ).toBeVisible();
    await expect(
      dialog.getByText("The Starter plan has room: 5 channels")
    ).toBeVisible();
    await expect(dialog.getByText("€9.00 a month, VAT incl.")).toBeVisible();
    await expect(dialog.getByText("€7.50 excl. VAT")).toBeVisible();
  });

  test("the order waits for the request to start at once, and is worded as an obligation to pay", async ({
    screen,
  }) => {
    const dialog = screen.getByRole("dialog");
    const order = dialog.getByRole("button", "Order with obligation to pay");

    await expect(order).toBeDisabled();
    await dialog
      .getByRole("checkbox", /^I ask Peal to start my subscription now/u)
      .check();
    await expect(order).toBeEnabled();

    await dialog.getByRole("button", "Yearly").tap();
    await expect(dialog.getByText("€90.00 a year, VAT incl.")).toBeVisible();

    await dialog.getByRole("button", "Not now").tap();
    await expect(screen.getByRole("dialog")).toBeHidden();
  });
});
