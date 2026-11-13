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
        asset.id, $1::uuid, 'ready', 'video/mp4', 2000000, 30000, 1920, 1080,
        'h264', $2::text,
        'e2e/media/' || $1::text || '/' || asset.id::text || '.mp4', now(),
        now()
      FROM asset`,
      [workspaceId, description]
    );
  } finally {
    await client.end();
  }
};

/**
 * Adds a ready synthetic image to the workspace's media library, named
 * `fileName` and described as `description`, straight in the database as
 * `seedVideo` does: tall (1080 × 1920), so its preview has to fit a phone.
 * Nothing reads its file, so none is stored.
 */
export const seedImage = async (
  workspaceId: string,
  fileName: string,
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
        id, workspace_id, status, content_type, byte_size, width, height,
        file_name, alt_text, storage_key, created_at, updated_at
      )
      SELECT
        asset.id, $1::uuid, 'ready', 'image/png', 200000, 1080, 1920,
        $2::text, $3::text,
        'e2e/media/' || $1::text || '/' || asset.id::text || '.png', now(),
        now()
      FROM asset`,
      [workspaceId, fileName, description]
    );
  } finally {
    await client.end();
  }
};
