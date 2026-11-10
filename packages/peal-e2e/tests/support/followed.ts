import { Client } from "pg";

// What analytics and the inbox keep of a post that went live, straight in
// the database the run's server uses: no platform can be reached in a run,
// so nothing is published and nothing is read. Both rows are written as
// no longer read (their window over), so the server's collections, which
// run during the tests, leave them alone and call no platform.

const channelOf = async (
  client: Client,
  workspaceId: string,
  handle: string
): Promise<string> => {
  const found = await client.query<{ id: string }>(
    `SELECT id FROM channels.channels WHERE workspace_id = $1 AND handle = $2`,
    [workspaceId, handle]
  );

  const [channel] = found.rows;

  if (channel === undefined) {
    throw new Error(`The workspace has no channel ${handle}`);
  }

  return channel.id;
};

/**
 * A post that went live on the workspace's channel `handle` an hour ago,
 * as analytics followed it: its latest counts, read once.
 */
export const seedCountedPost = async (
  workspaceId: string,
  handle: string,
  counts: { readonly likes: number; readonly reposts: number }
): Promise<void> => {
  const client = new Client({
    connectionString: process.env["DATABASE_URL"],
  });

  await client.connect();

  try {
    const channelId = await channelOf(client, workspaceId, handle);

    await client.query(
      `WITH post AS (SELECT uuidv7() AS target_id, uuidv7() AS post_id),
      tracked AS (
        INSERT INTO analytics.tracked_posts (
          target_id, post_id, workspace_id, channel_id, platform_post_id,
          published_at, last_collected_at, ended_at, end_reason, likes,
          reposts, replies
        )
        SELECT
          post.target_id, post.post_id, $1::uuid, $2::uuid,
          '113000000000000001', now() - interval '1 hour', now(), now(),
          'window', $3::int, $4::int, 0
        FROM post
        RETURNING target_id
      )
      INSERT INTO analytics.metric_snapshots (
        target_id, collected_at, likes, reposts, replies
      )
      SELECT target_id, now(), $3::int, $4::int, 0 FROM tracked`,
      [workspaceId, channelId, counts.likes, counts.reposts]
    );
  } finally {
    await client.end();
  }
};

/**
 * The comments under a post that went live on the workspace's channel
 * `handle`, as the inbox keeps them: one thread, with one comment someone
 * left, waiting for an answer.
 */
export const seedComment = async (
  workspaceId: string,
  handle: string,
  comment: { readonly author: string; readonly text: string }
): Promise<void> => {
  const client = new Client({
    connectionString: process.env["DATABASE_URL"],
  });

  await client.connect();

  try {
    const channelId = await channelOf(client, workspaceId, handle);

    await client.query(
      `WITH thread AS (
        INSERT INTO engagement.threads (
          id, workspace_id, channel_id, target_id, post_id, platform_post_id,
          published_at, ended_at, end_reason, comment_count, unanswered_count,
          last_comment_at
        ) VALUES (
          uuidv7(), $1::uuid, $2::uuid, uuidv7(), uuidv7(),
          '113000000000000001', now() - interval '1 hour', now(), 'window',
          1, 1, now() - interval '30 minutes'
        )
        RETURNING id
      )
      INSERT INTO engagement.comments (
        id, thread_id, workspace_id, channel_id, platform_comment_id,
        author_platform_id, author_handle, author_display_name, text,
        written_at, received_at, state
      )
      SELECT
        uuidv7(), thread.id, $1::uuid, $2::uuid, '113000000000000002',
        '7001', 'reader@social.example', $3::text, $4::text,
        now() - interval '30 minutes', now() - interval '20 minutes', 'new'
      FROM thread`,
      [workspaceId, channelId, comment.author, comment.text]
    );
  } finally {
    await client.end();
  }
};
