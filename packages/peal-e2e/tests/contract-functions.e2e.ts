import { describe, test } from "@e2e-dev/web";
import { expect } from "e2e";

// The functions to cancel a contract and to withdraw from one open for
// anyone, without signing in, under the words the law gives them. The
// run's server sells no subscription, so each page says there is no
// contract to end, its footer links to neither, and the API refuses a
// request.
describe("the contract functions", () => {
  test("open without signing in, in English and French", async ({
    app,
    browser,
    screen,
  }) => {
    await browser.clearCookies();
    await app.open("/cancel");
    await expect(
      screen.getByRole("heading", "Cancel your contract")
    ).toBeVisible();
    await expect(
      screen.getByText(
        "This Peal server sells no subscription: there is no contract to cancel or withdraw from."
      )
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

    const functions = await fetch(
      `${app.baseUrl}/api/contract-requests/functions`
    );

    expect(await functions.text()).toBe(
      '{"enabled":false,"turnstileSiteKey":null}'
    );

    const refused = await fetch(`${app.baseUrl}/api/contract-requests`, {
      body: JSON.stringify({
        contract: null,
        desiredOn: null,
        email: "member@example.test",
        kind: "cancellation",
        locale: "en",
        name: "Synthetic Member",
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    expect(refused.status).toBe(404);
  });
});
