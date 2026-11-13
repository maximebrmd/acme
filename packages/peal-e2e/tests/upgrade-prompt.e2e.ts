import { randomUUID } from "node:crypto";

import { describe, test } from "@e2e-dev/web";
import { credentials, expect } from "e2e";

import { confirmedAccount } from "./support/accounts.ts";
import { postPerAccountSubscription } from "./support/billing.ts";
import { seedChannel } from "./support/channels.ts";

// The run's server bills (scripts/serve.ts): a new workspace is on the free
// tier, which connects two accounts across its billing account. The billing
// page shows the tier, the month and the ladder; connecting a third account
// opens the upgrade dialog, which asks for a payment method. The member
// orders, Stripe's stand-in sends them straight back as if the card were
// taken, and the test posts the webhook Stripe would then send: the
// workspace is on per-account pricing, and the third account is no longer
// refused. Nothing is charged.
const run = randomUUID();
const name = "Robin Example";
const workspace = "Tide Tables";

const address = () =>
  credentials.user("member").username.replace("@", `+${run}-upgrade@`);

// This journey signs up through the API, so it must know the password:
// synthetic, like the address.
const password = "synthetic upgrade dialog password";

let workspaceId = "";

describe("per-account pricing", { serial: true }, () => {
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

  test("the billing page shows the free tier, the month and the ladder", async ({
    app,
    screen,
  }) => {
    await app.open(`/app/${workspaceId}/billing`);

    const main = screen.getByRole("main");

    await expect(main.getByText("Free tier")).toBeVisible();
    await expect(
      main.getByText(
        "Up to 2 connected accounts across the billing account, without a payment method."
      )
    ).toBeVisible();
    await expect(main.getByText("2 accounts connected.")).toBeVisible();
    await expect(
      main.getByText(
        "One more account, the 3rd, costs $5.00 a month, excluding tax."
      )
    ).toBeVisible();
    await expect(main.getByRole("rowheader", "Accounts 3 to 10")).toBeVisible();
    await expect(
      main.getByRole("heading", "Add a payment method")
    ).toBeVisible();
    await expect(
      main.getByRole("button", "Order with obligation to pay")
    ).toBeDisabled();
  });

  test("a third account opens the upgrade dialog, which asks for a payment method", async ({
    app,
    screen,
  }) => {
    await app.open(`/app/${workspaceId}/channels`);
    await screen.getByLabel("Server").fill("social.example");
    await screen.getByRole("button", "Connect Mastodon").tap();

    const dialog = screen.getByRole("dialog");

    await expect(
      dialog.getByRole(
        "heading",
        "Add a payment method to connect another account"
      )
    ).toBeVisible();
    await expect(
      dialog.getByText(
        `The billing account of ${workspace} is on the free tier, which connects 2 accounts across its workspaces, and it has 2.`
      )
    ).toBeVisible();
    await expect(
      dialog.getByText(
        "The 3rd costs $5.00 a month, excluding tax ($6.00 with 20% VAT), counted by the day; the first 2 stay free."
      )
    ).toBeVisible();

    // Monthly only: no period to choose.
    await expect(dialog.getByRole("button", "Yearly")).toBeHidden();
  });

  test("the order waits for the request to start at once, then goes through checkout and back", async ({
    screen,
  }) => {
    const dialog = screen.getByRole("dialog");
    const order = dialog.getByRole("button", "Order with obligation to pay");

    await expect(order).toBeDisabled();
    await dialog
      .getByRole("checkbox", /^I ask Peal to start per-account pricing now/u)
      .check();
    await expect(order).toBeEnabled();
    await order.tap();

    // The stand-in's checkout takes the card at once and sends the browser
    // back to the page the member was on.
    await expect(screen.getByRole("button", "Connect Mastodon")).toBeVisible();
    await expect(screen.getByRole("dialog")).toBeHidden();
  });

  test("once Stripe's event is recorded, the workspace is on per-account pricing and connects a third account", async ({
    app,
    screen,
  }) => {
    await postPerAccountSubscription(app.baseUrl, workspaceId);

    await app.open(`/app/${workspaceId}/billing`);

    const main = screen.getByRole("main");

    await expect(main.getByText("Per-account pricing")).toBeVisible();
    await expect(main.getByText("Active")).toBeVisible();
    await expect(
      main.getByRole("button", "Cancel your contract")
    ).toBeVisible();
    await expect(
      main.getByRole("button", "Order with obligation to pay")
    ).toBeHidden();

    // No platform is reached in a run: the connection now goes past the
    // plan and stops at the server it names, which does not exist.
    await app.open(`/app/${workspaceId}/channels`);
    await screen.getByLabel("Server").fill("social.example");
    await screen.getByRole("button", "Connect Mastodon").tap();
    await expect(
      screen
        .getByRole("main")
        .getByRole("alert")
        .getByText(
          "This is not the address of a server. Check it, for example mastodon.social."
        )
    ).toBeVisible();
    await expect(screen.getByRole("dialog")).toBeHidden();
  });
});
