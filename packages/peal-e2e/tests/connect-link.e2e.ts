import { randomUUID } from "node:crypto";

import { describe, test } from "@e2e-dev/web";
import { expect } from "e2e";

import { seedLink } from "./support/links.ts";

// A connect link's page, as the owner of a social account sees it: no Peal
// account, no session, nothing of the app. No platform is reached in a run,
// so the journey stops before the sign-in there.
const run = randomUUID().slice(0, 8);
const workspaceName = `Synthetic Bakery ${run}`;

describe("a connect link's hosted page", () => {
  test("asks a visitor without an account to connect theirs", async ({
    app,
    browser,
    screen,
  }) => {
    const page = await seedLink(workspaceName);

    await browser.clearCookies();
    await app.open(page);

    const main = screen.getByRole("main");

    await expect(
      main.getByRole("heading", "Connect your Mastodon account")
    ).toBeVisible();
    await expect(
      main.getByText(
        `${workspaceName} asks to connect your Mastodon account, to publish there for you.`
      )
    ).toBeVisible();
    await expect(main.getByLabel("Your Mastodon server")).toBeVisible();
    await expect(
      main.getByRole("button", "Continue to Mastodon")
    ).toBeVisible();

    // Nothing of the app: no header, so no way to sign in and no navigation.
    await expect(screen.getByRole("banner")).toBeHidden();
  });

  test("refuses an address that is no server", async ({
    app,
    browser,
    screen,
  }) => {
    const page = await seedLink(workspaceName);

    await browser.clearCookies();
    await app.open(page);

    const main = screen.getByRole("main");

    await main.getByLabel("Your Mastodon server").fill("not a server");
    await main.getByRole("button", "Continue to Mastodon").tap();

    await expect(
      main.getByText(
        "This is not the address of a server. Check it, for example mastodon.social."
      )
    ).toBeVisible();
  });

  test("says when a link has expired, and when it opens nothing", async ({
    app,
    browser,
    screen,
  }) => {
    const page = await seedLink(workspaceName, { expired: true });

    await browser.clearCookies();
    await app.open(page);

    await expect(
      screen
        .getByRole("main")
        .getByText(`This link has expired. Ask ${workspaceName} for a new one.`)
    ).toBeVisible();

    await app.open(`/connect/link/${run}-unknown`);

    await expect(
      screen
        .getByRole("main")
        .getByText(
          "This link opens nothing. Check that you have the whole address, or ask for a new link."
        )
    ).toBeVisible();
  });
});
