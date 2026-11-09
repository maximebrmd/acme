# Infrastructure

Ansible for the servers Acme runs on, production and the sandbox, each a
Hetzner Cloud server reachable only through a Cloudflare Tunnel. Nothing here
has been applied yet: the inventory holds placeholders (`example.com`,
`203.0.113.0/24`, `REPLACE…`), and every playbook refuses to run until they
are replaced.

Self-hosters do not need this folder: Caddy and Compose are enough (the docs'
self-hosting page, and [`acme-docker`](../acme-docker)).

## How it fits together

| Piece     | What it is                                                                                                                 |
| --------- | -------------------------------------------------------------------------------------------------------------------------- |
| Server    | Ubuntu LTS on Hetzner Cloud, security updates daily, the `ops` account with an SSH key                                     |
| Edge      | `cloudflared` on the host dials out to Cloudflare; no inbound port is open, SSH included                                   |
| Access    | Cloudflare Zero Trust Access guards Grafana, SSH, the admin and the whole sandbox                                          |
| Stack     | [`compose.production.yaml`](../acme-docker/compose.production.yaml) as the Compose project `acme`, every port on 127.0.0.1 |
| Telemetry | The OpenTelemetry Collector, Loki, Tempo, Prometheus and Grafana, in the stack                                             |
| Alerts    | Grafana's alert rules, sent to a Telegram chat                                                                             |
| Backups   | pgBackRest archives the write-ahead log and backs Postgres up to Cloudflare R2                                             |
| Uptime    | Checked from a separate server, not set up here                                                                            |

The tunnel's routes, for production (`roles/cloudflared/templates/config.yml.j2`):

| Host name             | Path                                       | Goes to                     | Access    |
| --------------------- | ------------------------------------------ | --------------------------- | --------- |
| `grafana.example.com` | any                                        | Grafana, 127.0.0.1:13000    | team only |
| `ssh.example.com`     | any                                        | sshd, 127.0.0.1:22          | team only |
| `app.example.com`     | `/api/auth/admin/*`, `/admin`, `/fr/admin` | the server or the web app   | team only |
| `app.example.com`     | `/api/*`, `/.well-known/oauth-*`           | the server, 127.0.0.1:3000  | public    |
| `app.example.com`     | anything else                              | the web app, 127.0.0.1:3001 | public    |
| `example.com`         | any                                        | the site, 127.0.0.1:4321    | public    |
| `docs.example.com`    | any                                        | the docs, 127.0.0.1:4322    | public    |

The sandbox has the same routes on its own names (`sandbox.example.com`,
`grafana-sandbox.example.com`…), all behind Access but for
`/api/channels/oauth/*`, which Bluesky's servers fetch. Cloudflare's free
certificate covers the zone and its first-level subdomains only, so no name
goes deeper than that.

A rule with Access needs an Access application at Cloudflare's edge, and
cloudflared checks the token Access adds too, so a route left without an
application refuses every request rather than opening. Grafana signs people in
from that token as editors; its `admin` account, whose password is generated
on the server, is the way in when Access is down.

Cloudflare's edge waits up to 100 seconds for an answer, and the writing
assistant answers within 90, so the tunnel needs no timeout of its own.

### Roles

| Role             | What it does                                                                                         |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| `acme_preflight` | Stops every playbook while the inventory holds placeholders                                          |
| `system`         | Host name, UTC, updates, unattended upgrades with reboots at 03:30 UTC, swap, journal size           |
| `ssh`            | The `ops` account, its keys (exclusive) and key-only SSH for it alone                                |
| `docker`         | Docker Engine and Compose from Docker's repository, with rotated logs                                |
| `cloudflared`    | cloudflared from its GitHub release (checked by digest), the tunnel's routes and its systemd service |
| `firewall`       | ufw: every incoming connection refused; port 22 open only while bootstrapping                        |
| `acme_runtime`   | `/srv/acme`, the secrets generated there, the credentials, the host settings and `acme-compose`      |
| `acme_backup`    | `acme-backup` and its timers: a full backup on Sundays, a differential one the other days            |
| `acme_release`   | Builds, uploads and starts one commit of Acme (`release.yml`)                                        |

### Playbooks

| Playbook        | When                                                                            |
| --------------- | ------------------------------------------------------------------------------- |
| `bootstrap.yml` | Once on a new server, as root: it creates `ops`                                 |
| `site.yml`      | Any time; it converges the server to this folder                                |
| `release.yml`   | To deploy `main`, or another branch, tag or commit with `-e acme_version=<ref>` |

Run each with `--limit production` or `--limit sandbox`, and `site.yml` with
`--check --diff` first. `release.yml` has no dry run.

### On the server

| Path                          | What it holds                                                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `/srv/acme/secrets.env`       | The database password, `BETTER_AUTH_SECRET`, `ACME_TOKEN_KEYS`, Grafana's admin password and the Bluesky client keys, generated there once |
| `/srv/acme/credentials.env`   | What outside services issued: R2 keys, the email key, the backup passphrase, Telegram's                                                    |
| `/srv/acme/host.env`          | Plain settings, written by Ansible                                                                                                         |
| `/srv/acme/release.env`       | The image tags that run                                                                                                                    |
| `/srv/acme/releases/<commit>` | Each release's Compose file and configuration, the last three kept                                                                         |
| `/srv/acme/current`           | Link to the release that runs                                                                                                              |
| `/etc/cloudflared/`           | The tunnel's routes and its token                                                                                                          |

`acme-compose` runs Docker Compose on the release that runs, with those
files. SSH is for reading:

```sh
ssh ops@ssh.example.com sudo acme-compose ps
ssh ops@ssh.example.com sudo acme-compose logs --tail 50 server
ssh ops@ssh.example.com systemctl list-timers 'acme-*'
ssh ops@ssh.example.com sudo acme-compose exec --user postgres postgres pgbackrest info
```

Your `~/.ssh/config` sends those through the tunnel:

```
Host ssh.example.com ssh-sandbox.example.com
  User ops
  ProxyCommand cloudflared access ssh --hostname %h
```

## Run the playbooks

You need [uv](https://docs.astral.sh/uv/), `cloudflared` (`brew install
cloudflared`), Git, and Docker with Buildx, which builds the images for the
servers' architecture (`linux/amd64` unless `acme_image_platform` says
otherwise; Docker Desktop and OrbStack emulate it on Apple silicon). From this
folder:

```sh
uv sync --locked
uv run ansible-galaxy collection install --requirements-file requirements.yml
uv run ansible-playbook playbooks/site.yml --limit sandbox --check --diff
```

`bun nx run acme-infra:test` runs ansible-lint with the production profile and
`ansible-playbook --syntax-check` on every playbook; `bun run test` includes it.

### Before the first run

These are made by hand, by the owner, on free plans. Anything that costs
money, the server and the domain first, or R2 beyond its free tier, needs
the owner's approval.

1. **The zone** on Cloudflare, for the domain.
2. **Zero Trust**: a team (`<team>.cloudflareaccess.com`) and these Access
   applications, each with a policy that lets in the team's emails. Copy each
   application's audience tag (AUD) into `cloudflare_access_aud`.
   - Grafana: `grafana.example.com`.
   - SSH: `ssh.example.com`.
   - Admin: `app.example.com/api/auth/admin`, `app.example.com/admin` and
     `app.example.com/fr/admin`.
   - Sandbox: its app, site and docs names, plus a Bypass policy on
     `sandbox.example.com/api/channels/oauth` for Bluesky; and its own Grafana
     and SSH applications.
3. **A tunnel per environment**, locally managed so `config.yml` holds its
   routes, from your own machine:

   ```sh
   cloudflared tunnel login                              # once, a certificate for your account
   cloudflared tunnel create acme-production
   cloudflared tunnel route dns acme-production app.example.com   # and each other name
   cloudflared tunnel token acme-production              # the token for the vault
   ```

4. **R2**: a media bucket and a backup bucket per environment, an API token
   with Object Read & Write on each bucket alone, and on the media bucket a
   lifecycle rule that aborts incomplete multipart uploads after a day. Put
   the upload CORS rule on it with `bun nx run acme-server:media-cors`, from
   your machine, with a token that may change the bucket's settings.
5. **Telegram**: a bot from @BotFather, and the id of the chat it writes to.
6. **Email**: a Resend key for a verified domain, or an SMTP server.

### Credentials

The server generates its own secrets and they never leave it. What outside
services issue reaches it in one of two ways:

- **The vault**: copy `inventory/vault.example.yml` to
  `inventory/group_vars/<environment>/vault.yml`, which Git ignores, fill it
  in, encrypt it with `uv run ansible-vault encrypt`, and add
  `--ask-vault-pass` to every run. Ansible writes the values to the server and
  never prints them.
- **On the server**: leave the vault out and write the same values there, as
  `NAME='value'` lines, over SSH:

  ```sh
  ssh -t ops@ssh.example.com 'sudo install -m 600 /dev/null /srv/acme/credentials.env && sudoedit /srv/acme/credentials.env'
  ssh -t ops@ssh.example.com 'sudo install -o root -g cloudflared -m 440 /dev/stdin /etc/cloudflared/token'
  ```

`site.yml` stops and names what is missing either way. Keep a copy of the
backup passphrase (`PGBACKREST_REPO1_CIPHER_PASS`) outside the server, in a
password manager: the backups cannot be read without it.

### A new server

1. Create it in the Hetzner console, with your SSH key for root, a Hetzner
   firewall with no inbound rule, and its address in `inventory/hosts.yml`.
2. `uv run ansible-playbook playbooks/bootstrap.yml --limit production -e ansible_user=root -e ssh_via_tunnel=false`
3. `uv run ansible-playbook playbooks/site.yml --limit production -e ssh_via_tunnel=false`:
   port 22 stays open while the tunnel comes up. With a Hetzner firewall in
   front, open 22 there for your address for these two runs.
4. Check SSH through the tunnel: `ssh ops@ssh.example.com true`.
5. `uv run ansible-playbook playbooks/site.yml --limit production`: Ansible
   now connects through the tunnel, and port 22 closes.
6. `uv run ansible-playbook playbooks/release.yml --limit production`.
7. Take the first backup, `ssh ops@ssh.example.com sudo systemctl start acme-backup@full`,
   and send a test alert from Grafana (Alerting › Contact points › Telegram ›
   Test).

If the tunnel ever stops carrying SSH, use the Hetzner console.

## Releases

`release.yml` checks the commit out from GitHub on the machine running
Ansible, builds the four images there (`acme-server`, `acme-web`,
`acme-static` with the environment's site and docs URLs, and `acme-postgres`,
named after its Dockerfile so Postgres restarts only when it changes), and
uploads them over SSH. The servers hold no repository or registry credentials,
and only pushed commits can be released. Then, on the server:

1. the old server stops, with 75 seconds to finish its calls to the platforms;
2. Postgres starts, and keeps the database password in step with
   `secrets.env`;
3. the new server starts and applies its migrations before it listens;
4. the rest of the stack starts, and the release is checked on the server and,
   for production, through the tunnel.

Release the sandbox first. To roll back, release the previous commit; its
images are still on the server for a week. Migrations do not run backwards, so
write each one so that the release before it still runs against it.

## Backups

Postgres archives each write-ahead log segment to the backup bucket as soon as
it fills, or after 5 minutes. `acme-backup` takes a full backup on Sundays and
a differential one the other days, at 02:15 UTC, and pgBackRest keeps four
full backups with what they need: four weeks of point-in-time recovery, at
most 5 minutes lost. Backups are compressed and encrypted with the backup
passphrase before they leave the server. Each one that finishes reports to the
collector, and Grafana alerts when none has for 30 hours, and when the disk is
85% full, as a stuck archive would make it.

pgBackRest rather than WAL-G: it comes from the PostgreSQL project's signed
apt repository, which the official Postgres image already trusts, at an exact
version and for both architectures, while WAL-G would be a binary checked by
hand-kept digests; it releases more often (2.60.0 in October 2026); and its
`check`, `info` and `verify` commands, retention by full backup and
`--type=time` restores make the runbook short.

Media live in R2 and are not backed up again; telemetry is not backed up. The
secrets are on the server only: [restoring onto a new server](runbooks/restore-database.md#a-new-server)
says what that costs.

[`runbooks/restore-database.md`](runbooks/restore-database.md) restores the
database, to its latest state or to a time.

## Idempotency

A second run of `site.yml` reports no change:

- Packages, users, keys, files, templates, units and ufw rules declare a
  state, which modules leave alone when it holds. The package upgrade reads
  the cached lists for an hour.
- Templates for sshd, sudoers and cloudflared's routes are validated before
  they replace the live files; `sshd -t` runs again on the whole
  configuration and reports no change.
- The swap file is created only when `/swapfile` is missing, and the secrets
  only when `secrets.env` is (`creates`).
- cloudflared's package is downloaded only when its digest differs, and
  installed only when that version is not.
- The credentials check reads names, never values, and changes nothing.
- Handlers restart sshd, journald, Docker or cloudflared only after a change;
  cloudflared's restart is scheduled a few seconds out, and Ansible waits for
  its connection, which may run through the tunnel.

`release.yml` changes what a release changes. Run again for the same commit,
it builds and uploads nothing (the images are on the server), creates no
Bluesky key (one is in `secrets.env`), leaves the database password alone
(the server's is accepted), and Compose recreates nothing.
