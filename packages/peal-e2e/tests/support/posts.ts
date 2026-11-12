import { Client } from "pg";

/**
 * The workspace's posts still scheduled, by id, read straight in the
 * database the run's server uses: what a journey that may have scheduled
 * one cancels, through the pages, before it ends.
 */
export const scheduledPosts = async (
  workspaceId: string
): Promise<string[]> => {
  const client = new Client({
    connectionString: process.env["DATABASE_URL"],
  });

  await client.connect();

  try {
    const found = await client.query<{ readonly id: string }>(
      `SELECT id FROM publishing.posts
        WHERE workspace_id = $1 AND status = 'scheduled'`,
      [workspaceId]
    );

    return found.rows.map(({ id }) => id);
  } finally {
    await client.end();
  }
};
