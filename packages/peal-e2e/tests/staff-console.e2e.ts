import { randomUUID } from "node:crypto";

import { describe, test } from "@e2e-dev/web";
import type { Browser } from "@e2e-dev/web";
import { credentials, expect } from "e2e";
import type { Screen } from "e2e";

import { confirmedAccount, makeStaff } from "./support/accounts.ts";

// Staff run the server from its console: a member is not let in, then
// staff find the member, ban them with a reason, lift the ban, act as them
// and come back, each action in the audit log. The module loads again for
// each attempt, so a retry uses new addresses.
const run = randomUUID();
const staffName = "Robin Staff";
const memberName = "Casey Member";

const addressOf = (label: string) =>
  credentials.user("member").username.replace("@", `+${run}-${label}@`);

const staffAddress = () => addressOf("staff");

const memberAddress = () => addressOf("customer");

// The accounts this journey signs up through the API, whose password it
// must know, unlike the run's member's: synthetic, like their addresses.
const password = "synthetic staff console password";

// The member's console page, which the test that finds them reads.
let memberPage = "";

const signIn = async (
  app: { readonly open: (path: string) => Promise<void> },
  browser: Browser,
  screen: Screen,
  email: string
) => {
  await browser.clearCookies();
  await app.open("/sign-in");
  await screen.getByLabel("Email").fill(email);
  await screen.getByLabel("Password").fill(password);
  await screen.getByRole("main").getByRole("button", "Sign in").tap();
};

// Opens an action's confirmation, says why, and confirms.
const act = async (
  screen: Screen,
  {
    confirm,
    open,
    reason,
    title,
  }: Record<"confirm" | "open" | "reason" | "title", string>
) => {
  await screen.getByRole("main").getByRole("button", open).tap();

  const dialog = screen.getByRole("alertdialog", title);

  await dialog.getByRole("textbox", "Why").fill(reason);
  await dialog.getByRole("button", confirm).tap();
};

describe("the staff console", { serial: true }, () => {
  test("is not there for a member", async ({ app, browser, screen }) => {
    await confirmedAccount(app.baseUrl, {
      email: memberAddress(),
      name: memberName,
      password,
    });

    await confirmedAccount(app.baseUrl, {
      email: staffAddress(),
      name: staffName,
      password,
    });

    await signIn(app, browser, screen, memberAddress());
    await expect(
      screen.getByRole("heading", `Hello, ${memberName}`)
    ).toBeVisible();

    const answer = browser.waitForResponse(/\/admin\/users$/u);

    await app.open("/admin/users");

    const page = await answer;

    expect(page.status).toBe(404);
    await expect(screen.getByRole("heading", "Page not found")).toBeVisible();

    // Nor is its API, signed in or not.
    const api = await fetch(`${app.baseUrl}/api/admin/users`);

    expect(api.status).toBe(404);
  });

  test("opens for staff, on the system's health", async ({
    app,
    browser,
    screen,
  }) => {
    await makeStaff(staffAddress());
    await signIn(app, browser, screen, staffAddress());
    await expect(
      screen.getByRole("heading", `Hello, ${staffName}`)
    ).toBeVisible();

    await app.open("/admin");

    await expect(
      screen.getByRole("heading", "System", { level: 1 })
    ).toBeVisible();
    await expect(screen.getByText("Answers")).toBeVisible();
    await expect(
      screen.getByText(`Staff: ${staffAddress().toLowerCase()}`)
    ).toBeVisible();
  });

  test("finds the member by email", async ({ browser, screen }) => {
    await screen
      .getByRole("navigation", "Staff console")
      .getByRole("link", "Accounts")
      .tap();
    await screen.getByLabel("Email, name or id").fill(memberAddress());
    await screen.getByRole("button", "Search").tap();
    await screen.getByRole("main").getByRole("link", memberName).tap();

    await expect(
      screen.getByRole("heading", memberName, { level: 1 })
    ).toBeVisible();
    await expect(screen.getByText("Not banned.")).toBeVisible();

    memberPage = new URL(await browser.url()).pathname;
    expect(memberPage).toMatch(/^\/admin\/users\/[0-9a-f-]+$/u);
  });

  test("bans the member with a reason, then lifts it", async ({ screen }) => {
    await act(screen, {
      confirm: "Ban the account",
      open: "Ban",
      reason: "Synthetic report of spam",
      title: `Ban ${memberName}?`,
    });

    await expect(screen.getByText(`${memberName} is banned.`)).toBeVisible();
    await expect(
      screen.getByText("Banned until the ban is lifted.")
    ).toBeVisible();
    await expect(
      screen.getByText("Reason given: Synthetic report of spam")
    ).toBeVisible();

    await act(screen, {
      confirm: "Lift the ban",
      open: "Lift the ban",
      reason: "Synthetic appeal accepted",
      title: `Lift the ban on ${memberName}?`,
    });

    await expect(screen.getByText("Not banned.")).toBeVisible();
  });

  test("acts as the member, then comes back", async ({ browser, screen }) => {
    await act(screen, {
      confirm: "Act as the account",
      open: "Act as this account",
      reason: "Synthetic support request",
      title: `Act as ${memberName}?`,
    });

    await expect(
      screen.getByRole("heading", `Hello, ${memberName}`)
    ).toBeVisible();

    const banner = screen.getByRole("region", "Acting as another account");

    await expect(banner).toBeVisible();
    await banner.getByRole("button", "Stop acting as them").tap();

    await expect(
      screen.getByRole("heading", memberName, { level: 1 })
    ).toBeVisible();
    await expect(browser).toHaveURL(memberPage);
    await expect(
      screen.getByRole("region", "Acting as another account")
    ).toBeHidden();
  });

  test("lists each action in the audit log", async ({ screen }) => {
    await screen
      .getByRole("navigation", "Staff console")
      .getByRole("link", "Audit log")
      .tap();

    await expect(
      screen.getByRole("heading", "Audit log", { level: 1 })
    ).toBeVisible();

    await Promise.all(
      [
        "Synthetic report of spam",
        "Synthetic appeal accepted",
        "Synthetic support request",
      ].map(async (reason) => {
        await expect(screen.getByRole("cell", reason)).toBeVisible();
      })
    );

    // Coming back from the member's account is recorded too, with the
    // route staff took.
    await expect(
      screen.getByRole(
        "cell",
        "Stopped acting as the account auth:/admin/stop-impersonating"
      )
    ).toBeVisible();
  });

  test("keeps legal requests from staff without the legal role", async ({
    app,
    browser,
    screen,
  }) => {
    await expect(
      screen
        .getByRole("navigation", "Staff console")
        .getByRole("link", "Legal requests")
    ).toBeHidden();

    const answer = browser.waitForResponse(/\/admin\/legal$/u);

    await app.open("/admin/legal");

    const page = await answer;

    expect(page.status).toBe(404);
    await expect(screen.getByRole("heading", "Page not found")).toBeVisible();
  });

  test("answers a legal request once recorded, showing only what it covers", async ({
    app,
    browser,
    screen,
  }) => {
    await makeStaff(staffAddress(), { legal: true });
    await signIn(app, browser, screen, staffAddress());
    await expect(
      screen.getByRole("heading", `Hello, ${staffName}`)
    ).toBeVisible();

    await app.open("/admin");
    await screen
      .getByRole("navigation", "Staff console")
      .getByRole("link", "Legal requests")
      .tap();

    await expect(
      screen.getByRole("heading", "Legal requests", { level: 1 })
    ).toBeVisible();
    // Staff are told, before they enter anything, that it is recorded.
    await expect(screen.getByText("Each answer is recorded")).toBeVisible();
    await expect(
      screen.getByText("No legal request has been answered yet.")
    ).toBeVisible();

    const send = screen.getByRole(
      "button",
      "Record the request and show the answer"
    );

    await expect(send).toBeDisabled();

    await screen.getByLabel("Identifier").fill(memberAddress());
    await screen.getByLabel("Authority").fill("Synthetic public prosecutor");
    await screen.getByLabel("Reference").fill("Synthetic requisition 0001");
    await screen
      .getByLabel("Legal basis")
      .fill("Synthetic code of criminal procedure, article 60-1");
    await screen
      .getByRole(
        "checkbox",
        "Who held the account: name, email address, creation date"
      )
      .tap();
    await send.tap();

    // The member's account is open: no closed account bears the address.
    await expect(screen.getByText("Answer recorded as")).toBeVisible();
    await expect(
      screen.getByText("No closed account is held for this subject.")
    ).toBeVisible();
    // The request did not ask for connections, so none are shown.
    await expect(screen.getByText("Not covered by this request")).toBeVisible();

    // The answer is listed, with its grounds, and in the audit log.
    await expect(
      screen.getByRole(
        "cell",
        "Synthetic public prosecutor Synthetic requisition 0001"
      )
    ).toBeVisible();
    await expect(
      screen.getByRole(
        "cell",
        "Synthetic code of criminal procedure, article 60-1"
      )
    ).toBeVisible();

    await screen
      .getByRole("navigation", "Staff console")
      .getByRole("link", "Audit log")
      .tap();
    await expect(
      screen.getByRole(
        "cell",
        "Synthetic public prosecutor: Synthetic requisition 0001"
      )
    ).toBeVisible();
  });
});
