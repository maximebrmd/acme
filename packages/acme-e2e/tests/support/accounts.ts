import { Client } from "pg";

import { emailedLink } from "./mailpit.ts";

/**
 * Signs up an account through the server's API and confirms its address
 * from the emailed link, as a person would, without the pages: for the
 * accounts a test acts on rather than as.
 */
export const confirmedAccount = async (
  baseUrl: string,
  account: {
    readonly email: string;
    readonly name: string;
    readonly password: string;
  }
): Promise<void> => {
  const created = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
    body: JSON.stringify(account),
    headers: { "content-type": "application/json", origin: baseUrl },
    method: "POST",
  });

  if (!created.ok) {
    throw new Error(`Signing up answered ${created.status}`);
  }

  const link = await emailedLink(account.email, "Confirm your email for Acme");

  await fetch(link, { redirect: "manual" });
};

/**
 * Makes an account staff (Better Auth's admin role), straight in the
 * database the run's server uses, as self-hosters do: no page grants it. The
 * account signs in again afterwards, as a session keeps the role it started
 * with.
 */
export const makeStaff = async (email: string): Promise<void> => {
  const client = new Client({
    connectionString: process.env["DATABASE_URL"],
  });

  await client.connect();

  try {
    await client.query(
      `UPDATE auth."user" SET role = 'admin' WHERE email = $1`,
      [email.toLowerCase()]
    );
  } finally {
    await client.end();
  }
};
