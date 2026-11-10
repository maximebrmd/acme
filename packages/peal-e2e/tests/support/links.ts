import { createHash, randomBytes, randomUUID } from "node:crypto";

import { Client } from "pg";

/**
 * Makes a workspace and a connect link to it, straight in the database the
 * run's server uses, and answers the link's page: creating one takes a
 * member or a key, which the page under test never has. The token is
 * random, and only its SHA-256 is stored, as the server stores it.
 * `expired` makes a link whose time has passed.
 */
export const seedLink = async (
  workspaceName: string,
  { expired = false }: { readonly expired?: boolean } = {}
): Promise<string> => {
  const client = new Client({
    connectionString: process.env["DATABASE_URL"],
  });

  const workspaceId = randomUUID();
  const token = randomBytes(32).toString("base64url");

  await client.connect();

  try {
    await client.query(
      `INSERT INTO auth.organization (id, name, slug, created_at)
       VALUES ($1::uuid, $2, $1::text, now())`,
      [workspaceId, workspaceName]
    );

    await client.query(
      `INSERT INTO channels.connect_links (
        id, workspace_id, platform, status, token_digest, starts,
        channel_ids, created_at, expires_at
      ) VALUES (
        uuidv7(), $1::uuid, 'mastodon', 'pending', $2, 0, '{}',
        now() - interval '2 hours', now() + $3::interval
      )`,
      [
        workspaceId,
        createHash("sha256").update(token).digest("hex"),
        expired ? "-1 hour" : "1 hour",
      ]
    );
  } finally {
    await client.end();
  }

  return `/connect/link#${token}`;
};
