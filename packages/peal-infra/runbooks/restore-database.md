# Restore the database

pgBackRest restores Postgres from the backup bucket: to its latest state,
which loses at most the last 5 minutes, or to a time since the oldest full
backup kept, three to four weeks back (`pgbackrest info` below shows it),
such as just before a bad migration or a mistaken deletion. Restoring
to a time also rewinds everything after it, so prefer the latest state unless
what happened after the time is the damage.

Run every command on the server, as `ops`, through the tunnel
(`ssh ops@ssh.peal.social`, or `ssh ops@sandbox-ssh.peal.social` for the
sandbox). Times are UTC.

## On the same server

1. **See the backups**, and the range of time they cover:

   ```sh
   sudo peal-compose exec --user postgres postgres pgbackrest info
   ```

2. **Stop the server and the web app.** The server gets 75 seconds to finish
   its calls to the platforms:

   ```sh
   sudo peal-compose stop web server
   ```

3. **Keep the current data**, if anything in it may be needed later and the
   disk has room for it (`df -h /`). Postgres must be stopped first:

   ```sh
   sudo peal-compose stop postgres
   sudo docker run --rm --volume peal_postgres:/from:ro --volume /srv/peal/before-restore:/to \
     busybox:1.38.0-musl cp -a /from/. /to/
   ```

4. **Restore** into the stopped database. `--delta` rewrites only the files
   that differ from the backup. To the latest state:

   ```sh
   sudo peal-compose stop postgres
   sudo peal-compose run --rm --no-deps --user postgres --entrypoint pgbackrest postgres \
     restore --delta
   ```

   Or to a time:

   ```sh
   sudo peal-compose run --rm --no-deps --user postgres --entrypoint pgbackrest postgres \
     restore --delta --type=time "--target=2026-11-09 06:00:00+00" --target-action=promote
   ```

5. **Start Postgres**, which replays the archived write-ahead log up to the
   target, then accepts writes. When this answers `f`, it is done:

   ```sh
   sudo peal-compose up --detach --wait postgres
   sudo peal-compose exec postgres psql --username peal --dbname peal --command 'SELECT pg_is_in_recovery()'
   ```

6. **Before starting the server after a restore to a time**, list the posts it
   would publish at once: those due in the restored database. Any that went
   out after the target time would go out again, since the restored jobs do not
   know they did. Keep the server stopped until someone has checked each one on
   its platforms with the workspace that wrote it.

   ```sh
   sudo peal-compose exec postgres psql --username peal --dbname peal --command \
     "SELECT id, workspace_id, status, scheduled_at FROM publishing.posts
      WHERE status IN ('scheduled', 'publishing') AND scheduled_at <= now() ORDER BY scheduled_at"
   ```

7. **Start the stack**, and check it answers:

   ```sh
   sudo peal-compose up --detach --wait
   curl --fail --silent http://127.0.0.1:3000/api/ready && echo ready
   ```

8. **Take a full backup.** A restore to a time starts a new timeline, which
   the next backups build on:

   ```sh
   sudo systemctl start peal-backup@full
   ```

Delete `/srv/peal/before-restore` once nothing in it is needed.

## A new server

When the server is lost, its secrets are lost with it: they were generated
there and never copied (`secrets.env`). The backups are in R2, encrypted with
the backup passphrase, which you kept outside the server.

1. Set up a new server as `README.md` says, through `site.yml`, with the same
   credentials, the backup passphrase included. It generates new secrets.
   Take one of the architecture the backups were made on, x86-64 or Arm64:
   PostgreSQL restores its files on that architecture and no other.
2. Release the commit that ran before, with `release.yml`. The new database is
   empty; stop the server and the web app, and Postgres, as in steps 2 and 4
   above.
3. Restore with steps 4 and 5 above.
4. Clear what the old secrets encrypted, so the server makes it again:
   Better Auth's signing keys, and Peal's registrations on Mastodon
   instances:

   ```sh
   sudo peal-compose exec postgres psql --username peal --dbname peal \
     --command 'DELETE FROM auth.jwks' --command 'DELETE FROM channels.mastodon_apps'
   ```

5. Run `release.yml` again. It sets the restored database's password to the
   new one, then starts the stack.
6. Take a full backup (step 8).

What the new secrets cost: everyone signs in again, the command line and MCP
clients too, and the channels' tokens can no longer be read, so members
reconnect their channels.

## Deletions since the restore point

A restore brings back the accounts and workspaces their users deleted after
the restore point, which the law asks to delete again before anyone can use
them. The server records each such deletion outside the database, in the
media bucket under `erasures/`: its id, the ids it deleted and the time,
nothing else, for 42 days, which is longer than any backup holds deleted
data. A restore does not touch that ledger, on the same server or a new one.

After every restore, to the latest state or to a time, once Postgres
answers (step 5) and before the stack starts (step 7):

1. Keep the server and the web app stopped.
2. Apply the ledger again. The command migrates the database as the server
   would, starts no server, worker or scheduled job, and publishes nothing:

   ```sh
   sudo peal-compose run --rm --no-deps server packages/peal-server/src/replay-erasures.ts
   ```

   It prints one line of totals, then one line for each entry it acted on,
   by id only:

   - `erased again`: the restore had brought the account or workspaces
     back, and they are deleted again. Their Stripe subscriptions were
     cancelled when they were first deleted, and Stripe is not restored.
   - `unconfirmed`: a deletion whose end the server never recorded, as it
     stopped in between. It is left alone. If the account or workspace is
     in the restored database, its owner asked for the deletion and passed
     every check, but nothing says whether it had taken effect before the
     incident: tell the owner, who decides. `--apply-unconfirmed` after the
     file name applies them too.
   - `unreadable`: an object of the ledger that is no entry, by its key,
     as one cut short: what it asked to erase is unknown and was not
     applied. The command exits with an error. Read the object in the
     store, tell the owner, and apply by hand what it can still be read to
     name before starting the stack.
   - `refused`: the deletion could not be applied, with why
     (`WorkspaceBusy`: a post marked as publishing, see step 6;
     `WorkspaceSubscribed` or `BillingUnavailable`: Stripe still bills it,
     or did not answer; `LastOwner`: the restore made the account the only
     member, or the only owner, of a workspace others had joined before it
     closed, so erasing it would leave that workspace to nobody: tell the
     owner, who decides what becomes of the workspace, as its other
     members' joining was lost with the restore). The command then exits
     with an error. Keep the
     stack stopped, fix the cause and run it again: it is safe to repeat,
     and what is gone stays gone.

3. Copy its output into the incident's record: it is the proof that the
   deletions were applied again.
4. Start the stack (step 7) only once the command exits without error.

On a new server, the command needs the media bucket's credentials, which
`site.yml` put back from the vault: nothing else. What the ledger cannot
cover: single posts, files or channels deleted since the restore point come
back with the restore, as only whole accounts and workspaces are recorded;
and a restore to a point more than 42 days back, which no backup allows.

## Practise

Restore into the sandbox from its own backups now and then, with the steps
above, so the commands and the passphrase are known to work before they are
needed. Never restore production's backups into the sandbox: they hold
customers' data.
