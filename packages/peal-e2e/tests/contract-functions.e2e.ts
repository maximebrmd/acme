import { randomUUID } from "node:crypto";

import { describe, test } from "@e2e-dev/web";
import { expect } from "e2e";

import { emailedLink } from "./support/mailpit.ts";

// The functions to cancel a contract and to withdraw from one open for
// anyone, without signing in, under the words the law gives them. The
// run's server sells subscriptions, so each page has its form, every
// page's footer links to both, and a request sent without a contract
// anyone can find is recorded and acknowledged by email.
describe("the contract functions", () => {
  test("open without signing in, in English and French", async ({
    app,
    browser,
    screen,
  }) => {
    await browser.clearCookies();
    await app.open("/cancel");

    const main = screen.getByRole("main");

    await expect(
      main.getByRole("heading", "Cancel your contract")
    ).toBeVisible();
    await expect(
      main.getByRole("textbox", "First and last name, or company name")
    ).toBeVisible();
    await expect(
      main.getByRole("textbox", "Contract number, or the workspace’s name")
    ).toBeVisible();

    const footer = screen.getByRole("navigation", "Your contract");

    await expect(
      footer.getByRole("link", "Cancel your contract")
    ).toBeVisible();
    await expect(
      footer.getByRole("link", "Withdraw from contract here")
    ).toBeVisible();

    await app.open("/fr/withdraw");
    await expect(
      screen.getByRole("heading", "Renoncer au contrat ici")
    ).toBeVisible();

    // The page of the link emailed to a request's address, without one.
    await app.open("/fr/contract-request");
    await expect(
      screen.getByText(
        "Cette page s’ouvre depuis le lien de l’e-mail que nous vous avons envoyé."
      )
    ).toBeVisible();
  });

  test("record a request nobody signed in for, and acknowledge it by email", async ({
    app,
  }) => {
    const functions = await fetch(
      `${app.baseUrl}/api/contract-requests/functions`
    );

    expect(await functions.text()).toBe(
      '{"enabled":true,"turnstileSiteKey":null}'
    );

    // An address no account has, and no contract number: a person will
    // look at it, and its sender is told when it came.
    const address = `holder+${randomUUID()}@example.test`;

    const received = await fetch(`${app.baseUrl}/api/contract-requests`, {
      body: JSON.stringify({
        contract: null,
        desiredOn: null,
        email: address,
        kind: "cancellation",
        locale: "en",
        name: "Synthetic Member",
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    expect(received.status).toBe(200);

    const link = await emailedLink(
      address,
      "We received the notification of your cancellation"
    );

    expect(new URL(link).origin).toBe(new URL(app.baseUrl).origin);
  });
});
