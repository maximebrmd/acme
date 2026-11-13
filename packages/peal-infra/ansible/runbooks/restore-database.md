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

7. **Turn the media sweeps off** before the server starts. A restored
   database does not know the files uploaded after its restore point, and
   the hourly sweeps would delete them for good: the orphan sweep takes
   them for files nothing holds, and the pending sweep deletes the files
   of uploads that were completed after it. The sweeps also stop by
   themselves on a restored database (the media folder's marker names the
   old timeline: `restored`), but keep this step. Add to the host's
   `peal_settings` in the inventory, then apply `site.yml` (`--check
   --diff` first), which writes it to `host.env` for step 8 to start with:

   ```yaml
   peal_settings:
     PEAL_MEDIA_SWEEPS: "off"
   ```

   Keep them off until the restore is confirmed final: nothing is going
   back to `/srv/peal/before-restore` or to a later restore point, and the
   files uploaded since the restore point have been dealt with (their
   media is gone with the rows; download what someone wants back from the
   bucket first). Then, to turn them back on:

   1. Hand the media folder to the restored database. The command prints
      the database, the bucket and prefix, the marker there now and what
      it would write; check them, then run it again with `--yes`:

      ```sh
      sudo peal-compose run --rm --no-deps server packages/peal-server/src/claim-media-folder.ts
      sudo peal-compose run --rm --no-deps server packages/peal-server/src/claim-media-folder.ts --yes
      ```

   2. Remove the line from `peal_settings`, apply `site.yml` again, and
      restart the server, which reads `host.env` only when it is created:

      ```sh
      sudo peal-compose up --detach --wait server
      ```

   3. Watch the first runs, at minute 19 (uploads never completed) and
      minute 49 (orphans): `peal-media-sweep-refused` must stay quiet, and
      the server's log says what each run deleted (`Swept the media
      store`).

8. **Start the stack**, and check it answers:

   ```sh
   sudo peal-compose up --detach --wait
   curl --fail --silent http://127.0.0.1:3000/api/ready && echo ready
   ```

9. **Take a full backup.** A restore to a time starts a new timeline, which
   the next backups build on:

   ```sh
   sudo systemctl start peal-backup@full
   ```

Delete `/srv/peal/before-restore` once nothing in it is needed.

## A new server

When the server is lost, its secrets are lost with it: they were generated
there and never copied (`secrets.env`), but in a planned move
([A planned move](#a-planned-move)). The backups are in R2, encrypted with
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

5. Turn the media sweeps off first, as [On the same server](#on-the-same-server)
   step 7 says (`PEAL_MEDIA_SWEEPS: "off"` in `peal_settings`), with the
   same steps to turn them back on. Then run `release.yml` again. It sets
   the restored database's password to the new one, then starts the stack.
   On a server that bills, when its play reports that Stripe's catalogue
   differs from this release's, as after a later release moved a price's
   lookup key, give Stripe this release's catalogue (`README.md`, "Stripe
   catalogue").
6. Take a full backup (step 9).

What the new secrets cost: everyone signs in again, the command line and MCP
clients too, and the channels' tokens can no longer be read, so members
reconnect their channels.

## A planned move

Moving to a new server while the old one still runs, to a larger one or to
another provider, keeps the old server's secrets: `secrets.env` is carried
from one to the other, the one secret ever copied off a server, and only
this way. Nobody signs in again and the channels' tokens still read. Plan
it as downtime, from step 2 until the new server runs the stack.

The order matters: the new server joins the old one's tunnel at its first
`site.yml`, after which `ssh.peal.social` may reach either. Until then, the
old one is reached through the tunnel and the new one by its address.

1. Create the new server, of the architecture the backups were made on, and
   run `bootstrap.yml` on it alone (`README.md`, "A new server", steps 1 and
   2, with its address in `host_vars/<host>/local.yml`). Not `site.yml` yet.
2. On the old server, stop the stack, after a full backup taken with the
   server and the web app stopped, so the restore loses nothing:

   ```sh
   sudo peal-compose stop web server
   sudo systemctl start peal-backup@full
   sudo peal-compose stop
   ```

   Its Postgres stays stopped from here on: two servers archiving to one
   backup bucket would mix their write-ahead logs.

3. Carry `secrets.env`, from your machine, in one pipe between two SSH
   sessions: the file goes from the old server's disk to the new one's,
   readable by root alone, and is never written on your machine, shown, or
   put anywhere else (no repository, chat or file in between). Check that
   the two digests match and that the mode is `600`:

   ```sh
   ssh ops@<new address> sudo install -d -m 0750 -o root -g root /srv/peal
   ssh ops@ssh.peal.social sudo cat /srv/peal/secrets.env \
     | ssh ops@<new address> 'sudo sh -c "umask 077 && cat > /srv/peal/secrets.env.new && mv /srv/peal/secrets.env.new /srv/peal/secrets.env"'
   ssh ops@ssh.peal.social sudo sha256sum /srv/peal/secrets.env
   ssh ops@<new address> sudo sha256sum /srv/peal/secrets.env
   ssh ops@<new address> sudo stat -c '%a %U' /srv/peal/secrets.env
   ```

4. Delete the file on the old server, then power the old server off in its
   provider's console, which takes its tunnel connector away. Keep the
   server, off, until the new one is confirmed: to go back, power it on and
   carry the file back the same way.

   ```sh
   ssh ops@ssh.peal.social sudo rm /srv/peal/secrets.env
   ```

5. Follow [A new server](#a-new-server) from step 1, without step 4: its
   `site.yml` finds `secrets.env` and generates none, and the old secrets
   still read what they encrypted.
6. Once the new server serves and its first backup is taken, delete the old
   server at its provider.

## Deletions since the restore point

A restore brings back the accounts and workspaces their users deleted after
the restore point, which the law asks to delete again before anyone can use
them. The server records each such deletion outside the database, in the
media bucket under `erasures/`: its id, the ids it deleted and the time,
nothing else, for 42 days, which is longer than any backup holds deleted
data. A restore does not touch that ledger, on the same server or a new one.

After every restore, to the latest state or to a time, once Postgres
answers (step 5) and before the stack starts (step 8):

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
4. Start the stack (step 8) only once the command exits without error.

On a new server, the command needs the media bucket's credentials, which
`site.yml` put back from the vault: nothing else. What the ledger cannot
cover: single posts, files or channels deleted since the restore point come
back with the restore, as only whole accounts and workspaces are recorded;
and a restore to a point more than 42 days back, which no backup allows.

## Starting a server's database over

pgBackRest ties a server's backups to the database cluster they were taken
from. When that cluster is replaced by a new one, as when a server's
Postgres volume is removed and Postgres initialises an empty database (the
sandbox reset, or the second pass of [Practise](#practise) left without its
restore), it refuses every backup and every write-ahead log segment:

```text
ERROR: [028]: backup and archive info files exist but do not match the database
```

Grafana's `peal-backup-failed` alert fires at the first refused backup,
and `peal-backup-stale` 30 hours after the last good one. Meanwhile the
write-ahead log stays on the server's disk, and nothing new can be
restored.

Start the backups over **only when the old backups are no longer wanted**:
it deletes every backup and archived segment of that server's stanza from
its bucket, for good, so the server can no longer be restored to any time
before it. If the old database may still be needed, restore it instead
([On the same server](#on-the-same-server)), which keeps the backups. On
production, that is the owner's decision, never a fix for an alert.

1. **Check you are on the server you mean**, and that the error is this one,
   in the last backup's journal and in Postgres's archiver:

   ```sh
   hostname
   sudo journalctl --unit 'peal-backup@*' --since -2d | grep -F '[028]'
   sudo peal-compose exec postgres psql --username peal --dbname peal --command \
     'SELECT failed_count, last_failed_wal, last_failed_time, last_archived_time FROM pg_stat_archiver'
   ```

2. **Stop pgBackRest**, so no backup or archive runs while the stanza is
   deleted. Postgres keeps running; each segment it tries to archive in the
   meantime is refused and kept on the server's disk, then archived after
   step 4. If the container restarts before step 3, its `/tmp` goes with
   pgBackRest's stop file: run this step again.

   ```sh
   sudo peal-compose exec --user postgres postgres pgbackrest stop
   ```

3. **Delete the stanza** from the bucket, with the old cluster's backups and
   archive. `--force` because Postgres is running. It removes the stop file
   when it is done, so pgBackRest runs again from here, and no `pgbackrest
   start` is needed (it would only warn that the stop file does not exist):

   ```sh
   sudo peal-compose exec --user postgres postgres pgbackrest stanza-delete --force
   ```

4. **Create the stanza** for the new cluster. Postgres's archive is accepted
   from now on, and it pushes the segments it kept, oldest first:

   ```sh
   sudo peal-compose exec --user postgres postgres pgbackrest stanza-create
   ```

5. **Wait until the archive has caught up.** `check` switches to a new
   segment and waits up to a minute for it to be archived, behind every
   segment kept since the database was started over. After hours of refused
   archives, it may give up with error 082 before the backlog is pushed: watch
   `last_archived_wal` move towards the current segment, then run `check`
   again, until it succeeds:

   ```sh
   sudo peal-compose exec --user postgres postgres pgbackrest check
   sudo peal-compose exec postgres psql --username peal --dbname peal --command \
     'SELECT last_archived_wal, last_archived_time, pg_walfile_name(pg_current_wal_lsn()) AS current_wal FROM pg_stat_archiver'
   ```

6. **Take a full backup**, which reports to Grafana and clears the alerts.
   It waits for its own last segment the same way; if it still fails with
   082, the archive has not caught up: `peal-backup-failed` keeps firing, go
   back to step 5, then run it again. A failed backup leaves nothing to
   clean up.

   ```sh
   sudo systemctl start peal-backup@full
   sudo systemctl status --no-pager peal-backup@full
   ```

7. **Check the backup and the archive.** `info` lists one full backup, with
   status `ok`; `last_failed_time` is older than `last_archived_time`:

   ```sh
   sudo peal-compose exec --user postgres postgres pgbackrest info
   sudo peal-compose exec postgres psql --username peal --dbname peal --command \
     'SELECT last_archived_time, last_failed_time FROM pg_stat_archiver'
   ```

## Practise

Restore into the sandbox from its own backups now and then, with the steps
above, so the commands and the passphrase are known to work before they are
needed. Never restore production's backups into the sandbox: they hold
customers' data.

Before a server goes live, drill on it, with synthetic data only (an account
signed up for the drill, while no customer uses the server), in two passes:

1. **To a time, on the same server.** Sign up a test account and note the
   time; wait for the next archive, 5 minutes at most; delete the account
   in the app. Then [On the same server](#on-the-same-server), steps 1 to
   9, restoring to the noted time: the account is back after step 5, and
   [Deletions since the restore point](#deletions-since-the-restore-point)
   prints `erased again` for it, and it is gone again. That proves the
   archive, the passphrase, point-in-time recovery and the ledger at once.
2. **As on a new server, without one**, since a server lost is restored
   on another. Stop the stack, keep the data aside (step 3), then remove
   Postgres's container and its volume, and start Postgres alone, which
   initialises an empty database, and stop it as soon as it answers:

   ```sh
   sudo peal-compose stop
   sudo docker run --rm --volume peal_postgres:/from:ro --volume /srv/peal/before-restore:/to \
     busybox:1.38.0-musl cp -a /from/. /to/
   sudo peal-compose rm --force postgres
   sudo docker volume rm peal_postgres
   sudo peal-compose up --detach --wait postgres
   sudo peal-compose stop postgres
   ```

   Then [A new server](#a-new-server) from its step 3: the restore, the
   deletions applied again, the two tables cleared, `release.yml` again
   and a full backup. The test account signs in again. The secrets did not
   change in this pass, so it does not show what new ones cost, which
   [A new server](#a-new-server) says.

Write each pass's date and how long it took, from stopping the stack to
`ready`, in the owner's notes: that is how long the service is down when
its server is lost.
