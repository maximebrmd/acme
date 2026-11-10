// Fills an empty, migrated database with synthetic rows at the size of a
// server with many users, to read query plans on (EXPLAIN) and to time the
// jobs that scan every workspace. Nothing here is a real account, post or
// token: ids are random, names are numbered, tokens are the word
// "synthetic".
//
//   DATABASE_URL=postgres://…/peal_scale bun src/migrate.ts
//   DATABASE_URL=postgres://…/peal_scale bun scripts/seed-scale.ts [users]
//
// Per user (the sizing model's averages): one workspace, 4 channels, 30
// posts a month on 2 or 3 channels each, over three months. The posts of
// the last 30 days are followed by analytics and due at the next
// collection; a day of posts is still scheduled. It refuses a database
// whose name does not end in "scale", and one that already holds posts.

import { Option, Schema } from "effect";

import { databaseNameOf } from "#shared/infrastructure/database-name.ts";

const url = process.env["DATABASE_URL"] ?? "";
const users = Number(process.argv[2] ?? "10000");

// The name in the URL's path, not anywhere in the URL: a parameter such as
// `?application_name=scale` names no database.
if (!Option.exists(databaseNameOf(url), (name) => name.endsWith("scale"))) {
  throw new Error("DATABASE_URL must name a database ending in 'scale'");
}

if (!Number.isInteger(users) || users < 1) {
  throw new Error("The number of users must be a whole number above 0");
}

const sql = new Bun.SQL(url);

const decodeExisting = Schema.decodeUnknownSync(
  Schema.Tuple([Schema.Struct({ name: Schema.String, posts: Schema.Number })])
);

const [existing] = decodeExisting(
  await sql`SELECT current_database() AS name, count(*)::int AS posts FROM publishing.posts`
);

// What the server itself says it is, whatever the URL was read as.
if (!existing.name.endsWith("scale")) {
  throw new Error("The database connected to does not end in 'scale'");
}

if (existing.posts > 0) {
  throw new Error("The database already holds posts");
}

const months = 3;
const postsPerUser = 30 * months;

const timed = async (label: string, run: () => Promise<void>) => {
  const startedAt = performance.now();

  await run();
  console.log(`${label}: ${Math.round(performance.now() - startedAt)} ms`);
};

await sql`CREATE TEMP TABLE seed_workspaces AS
  SELECT gen_random_uuid() AS id, number
  FROM generate_series(1, ${users}) AS number`;

await timed("channels", async () => {
  await sql`
  INSERT INTO channels.channels
    (id, workspace_id, platform, account_id, handle, access_token, refresh_token,
     token_key_id, token_kind, token_expires_at, token_issued_at, scopes, status,
     refresh_needed, created_at, updated_at)
  SELECT uuidv7(), workspace.id, platform.name,
         'synthetic-' || workspace.number || '-' || platform.slot,
         '@synthetic_' || workspace.number || '_' || platform.slot,
         'k1.synthetic.synthetic',
         CASE WHEN platform.kind = 'refreshable' THEN 'k1.synthetic.synthetic' END,
         'k1', platform.kind,
         CASE platform.kind
           WHEN 'refreshable' THEN now() + (random() * 60 - 40) * interval '1 day'
           WHEN 'nonRefreshable' THEN now() + random() * 60 * interval '1 day'
         END,
         CASE WHEN platform.kind = 'nonRefreshable' THEN now() - interval '1 day' END,
         ARRAY['synthetic'], 'active', false, now() - interval '100 days', now() - random() * interval '30 days'
  FROM seed_workspaces AS workspace
  CROSS JOIN LATERAL (
    SELECT slot,
           (ARRAY['mastodon','bluesky','linkedin','x','threads','instagram','facebook','tiktok','youtube'])[1 + (workspace.number + slot) % 9] AS name,
           (ARRAY['nonExpiring','refreshable','nonRefreshable','refreshable','refreshable','nonExpiring','nonExpiring','refreshable','refreshable'])[1 + (workspace.number + slot) % 9] AS kind
    FROM generate_series(1, 4) AS slot
  ) AS platform`;
});

// Posts spread evenly over the months before now and a day after it: those
// past are finished, those to come scheduled.
await timed("posts", async () => {
  await sql`
  INSERT INTO publishing.posts
    (id, workspace_id, status, outcome, text, schedule_zone, scheduled_at,
     started_at, finished_at)
  SELECT uuidv7(), workspace.id,
         CASE WHEN at.scheduled > now() THEN 'scheduled' ELSE 'finished' END,
         CASE WHEN at.scheduled > now() THEN NULL ELSE 'published' END,
         'Synthetic post ' || post, 'Europe/Paris', at.scheduled,
         CASE WHEN at.scheduled <= now() THEN at.scheduled END,
         CASE WHEN at.scheduled <= now() THEN at.scheduled + interval '5 seconds' END
  FROM seed_workspaces AS workspace
  CROSS JOIN generate_series(1, ${postsPerUser}) AS post
  CROSS JOIN LATERAL (
    SELECT now() + interval '1 day'
           - (post + random()) * (interval '1 day' * ${months * 30 + 1} / ${postsPerUser}) AS scheduled
  ) AS at`;
});

// Two or three targets a post, on the workspace's channels.
await timed("targets", async () => {
  await sql`
  INSERT INTO publishing.post_targets
    (id, post_id, channel_id, status, started_at, finished_at, platform_post_id, permalink)
  SELECT uuidv7(), post.id, channel.id,
         CASE WHEN post.status = 'finished' THEN 'published' ELSE 'pending' END,
         post.started_at, post.finished_at,
         CASE WHEN post.status = 'finished' THEN '11' || lpad((random() * 1e15)::bigint::text, 16, '0') END,
         CASE WHEN post.status = 'finished' THEN 'https://social.example/@synthetic/1' END
  FROM publishing.posts AS post
  CROSS JOIN LATERAL (
    SELECT id FROM (
      SELECT id, row_number() OVER (ORDER BY id) AS slot
      FROM channels.channels
      WHERE workspace_id = post.workspace_id
    ) AS numbered
    WHERE slot <= 2 + (get_byte(uuid_send(post.id), 15) % 2)
  ) AS channel`;
});

// Analytics follows what went live: read hourly for two days, daily until
// day 30 (due at the next run), no more after.
await timed("tracked posts", async () => {
  await sql`
  INSERT INTO analytics.tracked_posts
    (target_id, post_id, workspace_id, channel_id, platform_post_id,
     published_at, last_collected_at, likes, reposts, replies,
     next_collection_at, ended_at, end_reason)
  SELECT target.id, post.id, post.workspace_id, target.channel_id,
         target.platform_post_id, target.finished_at, now() - interval '1 hour',
         3, 1, 0,
         CASE
           WHEN target.finished_at > now() - interval '2 days'
             THEN date_trunc('hour', now()) + interval '7 minutes'
           WHEN target.finished_at > now() - interval '30 days'
             THEN date_trunc('hour', now()) + interval '7 minutes'
                  + (get_byte(uuid_send(target.id), 15) % 24) * interval '1 hour'
         END,
         CASE WHEN target.finished_at <= now() - interval '30 days' THEN target.finished_at + interval '30 days' END,
         CASE WHEN target.finished_at <= now() - interval '30 days' THEN 'window' END
  FROM publishing.post_targets AS target
  JOIN publishing.posts AS post ON post.id = target.post_id
  WHERE target.status = 'published'`;
});

await timed("analyze", async () => {
  await sql`ANALYZE`;
});

const decodeCounts = Schema.decodeUnknownSync(
  Schema.Tuple([
    Schema.Struct({
      channels: Schema.Number,
      collecting: Schema.Number,
      posts: Schema.Number,
      size: Schema.String,
      targets: Schema.Number,
      tracked: Schema.Number,
    }),
  ])
);

const [counts] = decodeCounts(
  await sql`
  SELECT (SELECT count(*) FROM channels.channels)::int AS channels,
         (SELECT count(*) FROM publishing.posts)::int AS posts,
         (SELECT count(*) FROM publishing.post_targets)::int AS targets,
         (SELECT count(*) FROM analytics.tracked_posts)::int AS tracked,
         (SELECT count(*) FROM analytics.tracked_posts WHERE next_collection_at IS NOT NULL)::int AS collecting,
         pg_size_pretty(pg_database_size(current_database())) AS size`
);

console.log(counts);

await sql.close();
