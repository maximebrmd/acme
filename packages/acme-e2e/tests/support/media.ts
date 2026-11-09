import { Client } from "pg";

/**
 * Adds a ready synthetic video to the workspace's media library, straight
 * in the database the run's server uses, described as `description`:
 * uploading one from the media page needs ffprobe on the machine that runs
 * the server. Nothing reads its file, since the tests publish nothing, so
 * none is stored.
 */
export const seedVideo = async (
  workspaceId: string,
  description: string
): Promise<void> => {
  const client = new Client({
    connectionString: process.env["DATABASE_URL"],
  });

  await client.connect();

  try {
    await client.query(
      `WITH asset AS (SELECT uuidv7() AS id)
      INSERT INTO media.media_assets (
        id, workspace_id, status, content_type, byte_size, duration_ms,
        width, height, codec, alt_text, storage_key, created_at, updated_at
      )
      SELECT
        asset.id, $1, 'ready', 'video/mp4', 2000000, 30000, 1920, 1080,
        'h264', $2, 'e2e/media/' || $1 || '/' || asset.id || '.mp4', now(),
        now()
      FROM asset`,
      [workspaceId, description]
    );
  } finally {
    await client.end();
  }
};
