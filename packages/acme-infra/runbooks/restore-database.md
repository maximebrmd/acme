# Restore the database

pgBackRest restores Postgres from the backup bucket: to its latest state,
which loses at most the last 5 minutes, or to a time within the last four
weeks, such as just before a bad migration or a mistaken deletion. Restoring
to a time also rewinds everything after it, so prefer the latest state unless
what happened after the time is the damage.

Run every command on the server, as `ops`, through the tunnel
(`ssh ops@ssh.example.com`). Times are UTC.

## On the same server

1. **See the backups**, and the range of time they cover:

   ```sh
   sudo acme-compose exec --user postgres postgres pgbackrest info
   ```

2. **Stop the server and the web app.** The server gets 75 seconds to finish
   its calls to the platforms:

   ```sh
   sudo acme-compose stop web server
   ```

3. **Keep the current data**, if anything in it may be needed later and the
   disk has room for it (`df -h /`). Postgres must be stopped first:

   ```sh
   sudo acme-compose stop postgres
   sudo docker run --rm --volume acme_postgres:/from:ro --volume /srv/acme/before-restore:/to \
     busybox:1.38.0-musl cp -a /from/. /to/
   ```

4. **Restore** into the stopped database. `--delta` rewrites only the files
   that differ from the backup. To the latest state:

   ```sh
   sudo acme-compose stop postgres
   sudo acme-compose run --rm --no-deps --user postgres --entrypoint pgbackrest postgres \
     restore --delta
   ```

   Or to a time:

   ```sh
   sudo acme-compose run --rm --no-deps --user postgres --entrypoint pgbackrest postgres \
     restore --delta --type=time "--target=2026-11-09 06:00:00+00" --target-action=promote
   ```

5. **Start Postgres**, which replays the archived write-ahead log up to the
   target, then accepts writes. When this answers `f`, it is done:

   ```sh
   sudo acme-compose up --detach --wait postgres
   sudo acme-compose exec postgres psql --username acme --dbname acme --command 'SELECT pg_is_in_recovery()'
   ```

6. **Before starting the server after a restore to a time**, list the posts it
   would publish at once: those due in the restored database. Any that went
   out after the target time would go out again, since the restored jobs do not
   know they did. Keep the server stopped until someone has checked each one on
   its platforms with the workspace that wrote it.

   ```sh
   sudo acme-compose exec postgres psql --username acme --dbname acme --command \
     "SELECT id, workspace_id, status, scheduled_at FROM publishing.posts
      WHERE status IN ('scheduled', 'publishing') AND scheduled_at <= now() ORDER BY scheduled_at"
   ```

7. **Start the stack**, and check it answers:

   ```sh
   sudo acme-compose up --detach --wait
   curl --fail --silent http://127.0.0.1:3000/api/ready && echo ready
   ```

8. **Take a full backup.** A restore to a time starts a new timeline, which
   the next backups build on:

   ```sh
   sudo systemctl start acme-backup@full
   ```

Delete `/srv/acme/before-restore` once nothing in it is needed.

## A new server

When the server is lost, its secrets are lost with it: they were generated
there and never copied (`secrets.env`). The backups are in R2, encrypted with
the backup passphrase, which you kept outside the server.

1. Set up a new server as `README.md` says, through `site.yml`, with the same
   credentials, the backup passphrase included. It generates new secrets.
2. Release the commit that ran before, with `release.yml`. The new database is
   empty; stop the server and the web app, and Postgres, as in steps 2 and 4
   above.
3. Restore with steps 4 and 5 above.
4. Clear what the old secrets encrypted, so the server makes it again:
   Better Auth's signing keys, and Acme's registrations on Mastodon
   instances:

   ```sh
   sudo acme-compose exec postgres psql --username acme --dbname acme \
     --command 'DELETE FROM auth.jwks' --command 'DELETE FROM channels.mastodon_apps'
   ```

5. Run `release.yml` again. It sets the restored database's password to the
   new one, then starts the stack.
6. Take a full backup (step 8).

What the new secrets cost: everyone signs in again, the command line and MCP
clients too, and the channels' tokens can no longer be read, so members
reconnect their channels.

## Practise

Restore into the sandbox from its own backups now and then, with the steps
above, so the commands and the passphrase are known to work before they are
needed. Never restore production's backups into the sandbox: they hold
customers' data.
