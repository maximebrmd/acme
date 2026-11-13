import { randomUUID } from "node:crypto";

import { describe, test } from "@e2e-dev/web";
import { credentials, expect } from "e2e";
import type { Locator } from "e2e";

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

type Locale = "en" | "fr";

interface Size {
  readonly height: number;
  readonly width: number;
}

// What the journey reads and taps, in each language.
const words = {
  en: {
    close: "Close",
    connect: "Connect Mastodon",
    notNow: "Not now",
    order: "Order with obligation to pay",
    prefix: "",
    server: "Server",
  },
  fr: {
    close: "Fermer",
    connect: "Connecter Mastodon",
    notNow: "Pas maintenant",
    order: "Commander avec obligation de paiement",
    prefix: "/fr",
    server: "Serveur",
  },
} as const;

// A box the page drew, which a visible element has.
const boxOf = async (element: Locator) => {
  const box = await element.boundingBox();

  if (box === null) {
    throw new Error("The element has no box");
  }

  return box;
};

// The dialog fits the window, its title and close button at its top, and
// its order button, scrolled to, within it; then it is closed.
const fits = async (dialog: Locator, locale: Locale, size: Size) => {
  await expect(dialog).toBeVisible();

  const box = await boxOf(dialog);
  const close = await boxOf(dialog.getByRole("button", words[locale].close));
  const title = await boxOf(dialog.getByRole("heading"));

  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(size.height);
  expect(box.x + box.width).toBeLessThanOrEqual(size.width);
  expect(close.y).toBeGreaterThanOrEqual(0);
  expect(title.y).toBeGreaterThanOrEqual(0);

  const order = dialog.getByRole("button", words[locale].order);

  await order.scrollIntoView();

  const button = await boxOf(order);

  expect(button.x + button.width).toBeLessThanOrEqual(box.x + box.width);

  await dialog.getByRole("button", words[locale].notNow).tap();
  await expect(dialog).toBeHidden();
};

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
        "One more account, the 3rd, costs $5.00 a month excluding tax, $6.00 with France’s 20% VAT."
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
        "The 3rd costs $5.00 a month excluding tax, $6.00 with France’s 20% VAT, counted by the day; the first 2 stay free."
      )
    ).toBeVisible();

    // Monthly only: no period to choose.
    await expect(dialog.getByRole("button", "Yearly")).toBeHidden();
  });

  test("on a phone, the dialog fits the window: its title, close button and order in reach, in English and French", async ({
    app,
    browser,
    screen,
  }) => {
    const opened = async (locale: Locale, size: Size) => {
      await browser.setViewport(size);
      await app.open(`${words[locale].prefix}/app/${workspaceId}/channels`);
      await screen.getByLabel(words[locale].server).fill("social.example");
      await screen.getByRole("button", words[locale].connect).tap();
      await fits(screen.getByRole("dialog"), locale, size);
    };

    await opened("en", { height: 568, width: 320 });
    await opened("en", { height: 667, width: 375 });
    await opened("fr", { height: 568, width: 320 });
    await opened("fr", { height: 667, width: 375 });
    await browser.setViewport({ height: 720, width: 1280 });
    // Back to English, which the French pages' language cookie replaced.
    await app.open(`/en/app/${workspaceId}/channels`);
    await expect(screen.getByLabel("Server")).toBeVisible();
  });

  test("the order waits for the request to start at once, then goes through checkout and back", async ({
    app,
    screen,
  }) => {
    await app.open(`/app/${workspaceId}/channels`);
    await screen.getByLabel("Server").fill("social.example");
    await screen.getByRole("button", "Connect Mastodon").tap();

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
