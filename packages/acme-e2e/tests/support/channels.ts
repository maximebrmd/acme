import { randomUUID } from "node:crypto";

import { Client } from "pg";

/**
 * Connects a synthetic Mastodon account to the workspace, straight in the
 * database the run's server uses: connecting one from the channels page signs
 * in on a Mastodon server on the public internet, which these runs do not
 * reach. Its token is never read, since the tests publish nothing, so it is
 * stored as a placeholder under the run's key id rather than encrypted.
 */
export const seedChannel = async (
  workspaceId: string,
  handle: string
): Promise<void> => {
  const client = new Client({
    connectionString: process.env["DATABASE_URL"],
  });

  await client.connect();

  try {
    await client.query(
      `INSERT INTO channels.channels (
        id, workspace_id, platform, account_id, handle, scopes, status,
        refresh_needed, token_kind, token_key_id, access_token, created_at,
        updated_at
      ) VALUES (
        uuidv7(), $1, 'mastodon', $2, $3, ARRAY['write:statuses'], 'active',
        false, 'nonExpiring', 'e2e', 'e2e.unread.unread', now(), now()
      )`,
      [workspaceId, randomUUID(), handle]
    );
  } finally {
    await client.end();
  }
};
