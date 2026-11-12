import { randomUUID } from "node:crypto";

import { describe, test } from "@e2e-dev/web";
import type { Browser } from "@e2e-dev/web";
import { credentials, expect } from "e2e";
import type { Screen } from "e2e";

import { confirmedAccount } from "./support/accounts.ts";
import { codeOf } from "./support/totp.ts";

// A member turns two-step verification on, signs out, signs in again with
// the password then a code from the app, and requires it of their
// workspace. The module loads again for each attempt, so a retry signs up
// under a new address.
const run = randomUUID();
const name = "Morgan Example";
const workspace = "Second Step";

const address = () =>
  credentials.user("member").username.replace("@", `+${run}-two-step@`);

// The account this journey signs up through the API, whose password it
// must know: synthetic, like its address.
const password = "synthetic two-step password";

// The key the account page shows, which the app would read from the QR code.
let key = "";

const signInWithPassword = async (
  app: { readonly open: (path: string) => Promise<void> },
  browser: Browser,
  screen: Screen
) => {
  await browser.clearCookies();
  await app.open("/sign-in");
  await screen.getByLabel("Email").fill(address());
  await screen.getByLabel("Password").fill(password);
  await screen.getByRole("main").getByRole("button", "Sign in").tap();
};

describe("two-step verification", { serial: true }, () => {
  test("is turned on from the account page", async ({
    app,
    browser,
    screen,
  }) => {
    await confirmedAccount(app.baseUrl, {
      email: address(),
      name,
      password,
    });

    await signInWithPassword(app, browser, screen);
    await expect(screen.getByRole("heading", `Hello, ${name}`)).toBeVisible();

    await screen.getByLabel("Workspace name").fill(workspace);
    await screen.getByRole("button", "Create the workspace").tap();
    await expect(
      screen.getByRole("navigation", `Posts of ${workspace}`)
    ).toBeVisible();

    await app.open("/app/account");
    await screen.getByRole("main").getByRole("button", "Turn on").tap();
    await screen.getByLabel("Your password").fill(password);
    await screen.getByRole("button", "Continue").tap();

    // The key, as text beside the QR code: Base32 letters and digits.
    const shown = screen.getByText(/^[A-Z2-7]{32,}$/u);

    await expect(shown).toBeVisible();
    key = (await shown.textContent()) ?? "";

    await screen
      .getByLabel("Enter the 6-digit code from your authenticator app")
      .fill(codeOf(key));
    await screen.getByRole("button", "Verify").tap();

    await expect(screen.getByRole("heading", "Recovery codes")).toBeVisible();
    await screen.getByRole("checkbox", "I saved these codes").check();
    await screen.getByRole("button", "Done").tap();

    await expect(screen.getByText("10 recovery codes left")).toBeVisible();
  });

  test("asks for a code after the password", async ({
    app,
    browser,
    screen,
  }) => {
    await signInWithPassword(app, browser, screen);

    await screen
      .getByLabel("Enter the 6-digit code from your authenticator app")
      .fill(codeOf(key));
    await screen.getByRole("button", "Verify").tap();

    await expect(screen.getByRole("heading", `Hello, ${name}`)).toBeVisible();
  });

  test("is required of the workspace's members", async ({ screen }) => {
    await screen
      .getByRole("navigation", `Posts of ${workspace}`)
      .getByRole("link", `Settings of ${workspace}`)
      .tap();
    await screen
      .getByRole("navigation", "Workspace settings")
      .getByRole("link", "Security")
      .tap();

    await screen.getByRole("main").getByRole("button", "Require it").tap();

    const dialog = screen.getByRole("dialog", "Require two-step verification?");

    await expect(
      dialog.getByText(
        "Every member has it on: nobody loses access. API keys keep working."
      )
    ).toBeVisible();
    await dialog.getByRole("button", "Require it").tap();

    await expect(
      screen
        .getByRole("main")
        .getByText("Two-step verification is required of every member.")
    ).toBeVisible();
  });
});
