# Infrastructure

Ansible for the servers Peal runs on, production and the sandbox, each a
server at a European provider reachable only through a Cloudflare Tunnel,
and for the uptime server that watches them from outside, at another
provider and in another city. Nothing here has been applied yet, and no
provider is chosen: the inventory names the hosts on `peal.social` but holds
placeholders for the rest (`203.0.113.0/24`, `example-team`, `REPLACE…`,
each server's `hosting_provider` and `hosting_location`), and every playbook
refuses to run until they are replaced.

Self-hosters do not need this folder: Caddy and Compose are enough (the docs'
self-hosting page, and [`peal-docker`](../../peal-docker)).

## How it fits together

| Piece     | What it is                                                                                                                                  |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Server    | Ubuntu LTS at a European provider ([which one](#choosing-a-provider-and-a-size)), security updates daily, the `ops` account with an SSH key |
| Edge      | `cloudflared` on the host dials out to Cloudflare; no inbound port is open, SSH included                                                    |
| Access    | Cloudflare Zero Trust Access guards Grafana, SSH, the admin and the whole sandbox                                                           |
| Stack     | [`compose.production.yaml`](../../peal-docker/compose.production.yaml) as the Compose project `peal`, every port on 127.0.0.1               |
| Telemetry | The OpenTelemetry Collector, Loki, Tempo, Prometheus and Grafana, in the stack                                                              |
| Alerts    | Grafana's alert rules, sent to a Telegram chat                                                                                              |
| Backups   | pgBackRest archives the write-ahead log and backs Postgres up to Cloudflare R2                                                              |
| Uptime    | Gatus on a server of its own checks the public endpoints, hears Grafana's heartbeat and serves the status page ([Uptime](#uptime))          |

The tunnel's routes, for production (`roles/cloudflared/templates/config.yml.j2`):

| Host name             | Path                                                                    | Goes to                     | Access    |
| --------------------- | ----------------------------------------------------------------------- | --------------------------- | --------- |
| `grafana.peal.social` | any                                                                     | Grafana, 127.0.0.1:13000    | team only |
| `ssh.peal.social`     | any                                                                     | sshd, 127.0.0.1:22          | team only |
| `app.peal.social`     | `/api/auth/admin/*`, `/api/admin/*`, `/admin`, `/en/admin`, `/fr/admin` | the server or the web app   | team only |
| `app.peal.social`     | `/api/*`, `/.well-known/oauth-*`                                        | the server, 127.0.0.1:3000  | public    |
| `app.peal.social`     | anything else                                                           | the web app, 127.0.0.1:3001 | public    |
| `peal.social`         | any                                                                     | the site, 127.0.0.1:4321    | public    |
| `docs.peal.social`    | any                                                                     | the docs, 127.0.0.1:4322    | public    |

The sandbox has the same routes on its own names (`sandbox.peal.social`,
`sandbox-grafana.peal.social`…), all behind Access but for what outside
services call: `/api/channels/oauth/*`, which Bluesky's servers fetch, and
Stripe's webhook (`/api/auth/stripe/webhook`) and Meta's data deletion and
deauthorize requests (`/api/data-deletion/<app>` and
`/api/data-deletion/<app>/deauthorize`, for its three apps), which the
server checks the signature of. A test keeps those paths equal to the
addresses the server lists as called by the platforms' servers
([The platforms' apps](#the-platforms-apps)). Cloudflare's free certificate covers the zone and
its first-level subdomains only, so no name goes deeper than that.

A rule with Access needs an Access application at Cloudflare's edge, and
cloudflared checks the token Access adds too, so a route left without an
application refuses every request rather than opening. cloudflared matches a
rule's path after resolving dot segments, backslashes and repeated slashes
(since 2026.10.0), and the admin paths in any letter case, so no way of
writing a path reaches the admin without the token;
[`tests/test_cloudflared.py`](tests/test_cloudflared.py) tries them. Grafana
signs people in from that token as Admins of its organisation, with full
access: whoever Grafana's Access policy lets through, the staff, can change
data sources, dashboards, alerting and users, and Grafana sets the role again
at each sign-in. Its `admin` account, whose password is generated on the
server, is the way in when Access is down.

Cloudflare's edge waits up to 100 seconds for an answer, and the writing
assistant answers within 90, so the tunnel needs no timeout of its own.

### Roles

| Role             | What it does                                                                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `peal_preflight` | Stops every playbook while the inventory holds placeholders                                                                                            |
| `system`         | Host name (kept across boots where cloud-init manages the hosts file), UTC, updates, unattended upgrades with reboots at 03:30 UTC, swap, journal size |
| `ssh`            | The `ops` account, its keys (exclusive) and key-only SSH for it alone, without port forwarding; the image's own account removed                        |
| `docker`         | Docker Engine and Compose from Docker's repository, at exact versions, with rotated logs                                                               |
| `cloudflared`    | cloudflared from its GitHub release (checked by digest), the tunnel's routes and its systemd service                                                   |
| `firewall`       | ufw: every incoming connection refused; port 22 open only while bootstrapping                                                                          |
| `peal_runtime`   | `/srv/peal`, the secrets generated there, the credentials, the host settings and `peal-compose`                                                        |
| `peal_backup`    | `peal-backup` and its timers: a full backup on Sundays, a differential one the other days                                                              |
| `peal_release`   | Builds, uploads and starts one commit of Peal (`release.yml`)                                                                                          |
| `uptime`         | Gatus and Caddy on the uptime server, their configuration from the inventory (`uptime.yml`)                                                            |

### Playbooks

| Playbook        | When                                                                            |
| --------------- | ------------------------------------------------------------------------------- |
| `bootstrap.yml` | Once on a new server, as the account its image lets in: it creates `ops`        |
| `site.yml`      | Any time; it converges the server to this folder                                |
| `release.yml`   | To deploy `main`, or another branch, tag or commit with `-e peal_version=<ref>` |
| `uptime.yml`    | Any time, on the uptime server alone; it converges it to this folder            |

Run each with `--limit production` or `--limit sandbox` (`--limit uptime` for
`bootstrap.yml` on the uptime server), and `site.yml` and `uptime.yml` with
`--check --diff` first. `release.yml` has no dry run.

### On the server

| Path                          | What it holds                                                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `/srv/peal/secrets.env`       | The database password, `BETTER_AUTH_SECRET`, `PEAL_TOKEN_KEYS`, Grafana's admin password and the Bluesky client keys, generated there once |
| `/srv/peal/credentials.env`   | What outside services issued: R2 keys, the email key, the backup passphrase, Telegram's                                                    |
| `/srv/peal/host.env`          | Plain settings, written by Ansible                                                                                                         |
| `/srv/peal/release.env`       | The image tags that run                                                                                                                    |
| `/srv/peal/releases/<commit>` | Each release's Compose file and configuration, the last three kept                                                                         |
| `/srv/peal/current`           | Link to the release that runs                                                                                                              |
| `/etc/cloudflared/`           | The tunnel's routes and its token                                                                                                          |

`peal-compose` runs Docker Compose on the release that runs, with those
files. SSH is for reading:

```sh
ssh ops@ssh.peal.social sudo peal-compose ps
ssh ops@ssh.peal.social sudo peal-compose logs --tail 50 server
ssh ops@ssh.peal.social systemctl list-timers 'peal-*'
ssh ops@ssh.peal.social sudo peal-compose exec --user postgres postgres pgbackrest info
```

Your `~/.ssh/config` sends those through the tunnel:

```
Host ssh.peal.social sandbox-ssh.peal.social
  User ops
  ProxyCommand cloudflared access ssh --hostname %h
```

## Choosing a provider and a size

No provider is chosen, and nothing in this folder depends on one: the roles
use no provider's API, module or collection, and the servers are created by
hand in a console. What a choice changes is the inventory: each server's
address in `hosts.yml`, and its `hosting_provider` and `hosting_location`
(the city) in its group's `main.yml`, placeholders until then. Production
and the sandbox may share a provider; the uptime server shares neither a
provider nor a city with them ([Uptime](#uptime)).

### What the stack needs of a provider

| Need                         | Why                                                                                                                                                                                                                                                                        |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A European company           | Production holds customers' data: the provider is a processor, with a data processing agreement, and its data centres are in the EU                                                                                                                                        |
| An Ubuntu LTS image          | The roles are written for it: apt, unattended upgrades, ufw, sshd's drop-in folder, and Docker's packages, pinned for the release the server runs (`docker_packages`: 24.04 or 26.04)                                                                                      |
| x86-64 or Arm64              | Either: `release.yml` builds the images for each server's own architecture, and cloudflared's package is pinned for both ([Architecture](#architecture))                                                                                                                   |
| A public IPv4 address        | The servers dial out over it: GitHub, which cloudflared's package comes from, has no IPv6 address. The uptime server is reached on it                                                                                                                                      |
| An IPv6 address              | For the uptime server, whose name has an AAAA record beside its A record. Production and the sandbox need none                                                                                                                                                             |
| A firewall in front          | Beside ufw on the server: no inbound rule for production and the sandbox, but port 22 from your address while one is bootstrapped; for the uptime server, port 443 from anywhere and port 22 from the addresses you work from                                              |
| Snapshots                    | Before a change that is hard to undo, such as a Docker Engine or Ubuntu upgrade. A snapshot holds the server's secrets: keep it at the provider, and delete it after. It replaces no backup ([Backups](#backups))                                                          |
| A rescue system or a console | The way in when the tunnel stops carrying SSH, with port 22 closed. Neither root nor `ops` has a password, so a console that only offers a login prompt lets nobody in: it takes a rescue system that mounts the server's disk ([Without the tunnel](#without-the-tunnel)) |
| A disk that grows            | Postgres's and the telemetry's volumes are on the root disk, under `/var/lib/docker`; media are in the bucket                                                                                                                                                              |

Nothing else: no load balancer, as the tunnel is the one entry; no private
network while one server runs the stack; no managed database, as Postgres
runs in the stack with its own backups. Outgoing connections are all the
servers open, to the tunnel, the platforms, the bucket, the mail service
and the package repositories.

### Architecture

`release.yml` builds each image on the machine running Ansible for the
server it goes to, from the server's facts: `linux/amd64` on an x86-64
server, `linux/arm64` on an Arm one. Built on a machine of the same
architecture, as an Apple silicon Mac for an Arm server, the build is
native. For the other architecture, Buildx emulates it, more slowly: Docker
Desktop and OrbStack ship the emulation, and on Linux
`docker run --privileged --rm tonistiigi/binfmt --install arm64` (or
`amd64`) installs it. `-e peal_image_platform=linux/arm64`, or the same in
the inventory, builds for a platform whatever the server's facts say. Each
platform has its own archive under `.ansible/release`, so one built for the
other is never uploaded.

Choose the architecture for good. PostgreSQL restores a backup on the
hardware architecture it was taken on and no other
([its documentation](https://www.postgresql.org/docs/18/warm-standby.html#STANDBY-PLANNING)),
so [the runbook](runbooks/restore-database.md#a-new-server) carries a
database to a new server of the same architecture only. Moving to the other
one takes a dump of the database (`pg_dump`) loaded into a new server, with
the stack stopped meanwhile, which nothing here does yet.

### Size

These sizes come from a model of the load the code puts on a server, not
from measurements: each account, idle ones included, counted as four
channels and thirty posts a month to two or three of them, read by the
hourly analytics for thirty days. The model gives a database of about 15 GB
after a year for 1,000 users, 45 GB for 3,000 and 150 GB for 10,000, and a
few requests a second at most: memory and the disk fill long before the
processors do. Check a provider's current plans against the shapes, and
measure before moving up.

| Users        | Production                                          | Postgres                                                                                                                            |
| ------------ | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| About 1,000  | One server: 4 vCPUs, 16 GB of memory, a 100 GB disk | On it, with the rest of the stack                                                                                                   |
| About 3,000  | One server: 8 vCPUs, 32 GB of memory, a 200 GB disk | On it                                                                                                                               |
| About 10,000 | The app's server: 8 vCPUs, 32 GB, a 100 GB disk     | A machine of its own: 6 dedicated cores or more, 32 GB, two local NVMe disks mirrored, and a standby like it in another data centre |

The sandbox is a small copy at any size, 2 vCPUs, 8 GB and a 50 GB disk,
and the uptime server needs 1 vCPU, 1 GB and 10 GB. Shared vCPUs do for the
first two sizes. Going from the first to the second is a resize in the
provider's console, a few minutes down, with nothing to change here but
`swap_size_mb` if you want more.

Move up when one of these holds for days:

- the hourly analytics run takes more than 30 minutes;
- Postgres reads from disk more than 1 time in 100, or the database is
  larger than half the memory;
- memory stays above 80%, or swap is used every day;
- the disk is 70% full (Grafana alerts at 85%);
- the processors lose more than 10% of their time to other tenants
  (steal): take dedicated vCPUs.

One process runs every job, so the app grows by taking a bigger server, not
a second one.

**The third size is not built yet.** Everything here runs one server per
environment: `compose.production.yaml` starts Postgres beside the server,
the inventory has one host for each environment, `release.yml` stops and
starts both on that host, and `peal_backup` runs where Postgres does.
Putting Postgres on its own machine takes, before any is ordered:

- the stack's Compose file split, so a database host runs Postgres alone,
  and the app's `DATABASE_URL` naming it;
- a `database` group in the inventory, a private network between the two
  hosts, and a firewall rule that opens Postgres's port to it alone;
- `release.yml` stopping the old server on one host before Postgres
  restarts on the other;
- a standby that follows the primary, built from the backups, and a runbook
  to promote it.

Until then, a larger single server, with more memory than the second size,
is the way past 3,000 users.

## Run the playbooks

You need [uv](https://docs.astral.sh/uv/), `cloudflared` (`brew install
cloudflared`), Git, and Docker with Buildx, which builds the images for the
servers' architecture: each server's own, from its facts (`linux/amd64` on
x86 servers, `linux/arm64` on Arm ones), unless `peal_image_platform` names
another in the inventory or with `-e`. Docker Desktop and OrbStack emulate
`linux/amd64` on Apple silicon. From this folder:

```sh
uv sync --locked
uv run ansible-galaxy collection install --requirements-file requirements.yml
uv run ansible-playbook playbooks/site.yml --limit sandbox --check --diff
```

Check mode works on a new server too, once `bootstrap.yml` has run: a task
that needs what an earlier one would make, such as Docker's configuration
before Docker is installed, skips when that one reports a change, and the
next run shows it. It reads the server's package lists, which refresh daily.

`bun nx run peal-infra-ansible:test` runs ansible-lint with the production profile,
`ansible-playbook --syntax-check` on every playbook, and the tests in
[`tests/`](tests) (`uv run pytest`), which read what Ansible renders for each
server:

- the tunnel's routes, and what host.env may hold;
- the secrets the server generates, and the swap file's creation;
- Docker Engine's pins, and the platform images are built for;
- the release's steps on Postgres, run against its image;
- the uptime server: its checks against each environment's host names, then
  Gatus and Caddy run with the configuration Ansible renders, on a network
  that reaches nothing outside, to show that Gatus loads it and takes a
  heartbeat with its token only, and that Caddy shows the world nothing else.

The tests that need Docker skip when it is not running. `bun run test`
includes them.

Each of these commands reads stdin from `/dev/null`. Nx gives every task it
runs the same stdin, which a Node task reading it makes non-blocking for all
of them while it runs; Ansible then refuses to start ("Ansible requires
blocking IO on stdin/stdout/stderr"), and ansible-lint reports it as "Unable
to find a working copy of ansible executable".

### Before the first run

These are made by hand, by the owner, on free plans. Anything that costs
money, the server and the domain first, or R2 beyond its free tier, needs
the owner's approval.

1. **The zone** on Cloudflare, for the domain.
2. **Zero Trust**: a team (`<team>.cloudflareaccess.com`) and these Access
   applications, each with a policy that lets in the team's emails. Copy each
   application's audience tag (AUD) into `cloudflare_access_aud`.
   - Grafana: `grafana.peal.social`.
   - SSH: `ssh.peal.social`.
   - Admin: `app.peal.social/api/auth/admin`, `app.peal.social/api/admin`
     (the staff console's API), `app.peal.social/admin`,
     `app.peal.social/en/admin` (where Next also serves English pages) and
     `app.peal.social/fr/admin`.
   - Sandbox: its app, site and docs names; an application with a Bypass
     policy for everyone on each path outside services call,
     `sandbox.peal.social/api/channels/oauth` for Bluesky,
     `sandbox.peal.social/api/auth/stripe/webhook` for Stripe, and
     `sandbox.peal.social/api/data-deletion` for Meta; and its own Grafana and
     SSH applications. The uptime server's checks of the sandbox need a
     service token and a Service Auth policy on its application too (see
     [Uptime › Set it up](#set-it-up)).
3. **A tunnel per environment**, locally managed so `config.yml` holds its
   routes, from your own machine:

   ```sh
   cloudflared tunnel login                              # once, a certificate for your account
   cloudflared tunnel create peal-production
   cloudflared tunnel route dns peal-production app.peal.social   # and each other name
   cloudflared tunnel token peal-production              # the token for the vault
   ```

4. **Object storage in the EU** ([Object storage](#object-storage) says what
   any S3 store needs). On Cloudflare R2, which the inventory's placeholders
   name: a media bucket and a backup bucket per environment, created in
   R2's EU jurisdiction (their endpoint is
   `<account>.eu.r2.cloudflarestorage.com`), which cannot be changed once a
   bucket exists: a bucket made without it is deleted while empty and made
   again. An API token with Object Read & Write on each bucket alone, and on
   the media bucket a lifecycle rule that aborts incomplete multipart uploads
   after a day; never an expiry rule on a backup bucket, as pgBackRest keeps
   its own and a restore needs every WAL file. With Wrangler, every bucket
   command takes `--jurisdiction eu`:

   ```sh
   wrangler r2 bucket create peal-production-media --jurisdiction eu
   wrangler r2 bucket info peal-production-media --jurisdiction eu   # check its jurisdiction
   wrangler r2 bucket lifecycle add peal-production-media abort-incomplete-uploads --abort-multipart-days 1 --jurisdiction eu
   wrangler r2 bucket lifecycle add peal-production-media expire-erasures erasures/ --expire-days 42 --jurisdiction eu
   ```

   The second rule is for the erasure ledger, which the server keeps under
   `erasures/` in the media bucket (the id and time of each deleted account
   and workspace, for [restores](#backups)): entries go after 42 days, a
   little longer than backups hold deleted data. The server drops them
   itself each day; the rule is a second guard. Its prefix must be exactly
   `erasures/`: a rule on another prefix, or on none, would delete media.
   Check it with `wrangler r2 bucket lifecycle list`. Before the media
   bucket ever gets a public domain, give the ledger a private bucket of
   its own (`peal_erasure_ledger_bucket`, with a token that reaches both).

   Put the upload CORS rule on the media bucket with
   `bun nx run peal-server:media-cors`, from your machine, with a token that
   may change the bucket's settings, or paste the policy it prints into the
   dashboard (R2 › the bucket › Settings › CORS policy), which needs no such
   token.

5. **Telegram** ([Telegram](#telegram)): three bots from @BotFather, one for
   each server that alerts, and two private channels.
6. **Email**: a Resend key for the verified sending domain `peal.social`,
   which sends as `notifications@peal.social` (`peal_mail_from`).
7. **The platforms' apps**, a set of its own for each environment
   ([The platforms' apps](#the-platforms-apps)).

### The platforms' apps

Each environment has its own apps on the platforms (LinkedIn, X, Meta's
three use cases, TikTok, a Google OAuth client for YouTube), each given
that environment's addresses: where the platform sends people back and,
for Meta, where its servers call. Print them, and copy them from what is
printed, never by hand:

```sh
# From the repository root, before a server exists:
PUBLIC_URL=https://app.peal.social bun nx run peal-server:platform-addresses
# On a server that runs, for its own PUBLIC_URL:
ssh ops@ssh.peal.social sudo peal-compose exec server bun packages/peal-server/scripts/platform-addresses.ts
```

The command builds the list from the paths the server's sign-ins send and
its routes answer, and the server's tests fail when a platform gains one
that the list lacks, so it is the one place to read them from. It reads
`PUBLIC_URL` and nothing else. Each app's id goes in `peal_settings`, and
its secret in the vault (`inventory/vault.example.yml` names them); the
docs' self-hosting page says what each platform asks of an app besides.

The addresses it marks as called by the platform's servers must answer
without Access. Production is public. On the sandbox, they are
`peal_access_bypass_paths` (`group_vars/all/main.yml`), each with its
Bypass application at Cloudflare's edge (step 2 above):
`tests/test_cloudflared.py` runs the command for the sandbox's name and
fails when cloudflared would stop one of them.

### Object storage

Media and the database's backups go to two buckets of any store that
speaks the S3 API, in the EU, each with a key that reads and writes its
bucket alone:

| What                   | Inventory                                                                                              | Reaches the stack as                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| The media bucket       | `peal_media_endpoint`, an `https://` URL; `peal_media_bucket`                                          | `PEAL_S3_ENDPOINT`, `PEAL_S3_BUCKET`                                                  |
| Its key                | the vault: `PEAL_S3_ACCESS_KEY_ID`, `PEAL_S3_SECRET_ACCESS_KEY`                                        | the same                                                                              |
| The backup repository  | `peal_backup_endpoint`, a host without a scheme; `peal_backup_bucket`; `peal_backup_path`              | `PGBACKREST_REPO1_S3_ENDPOINT`, `PGBACKREST_REPO1_S3_BUCKET`, `PGBACKREST_REPO1_PATH` |
| Its key and passphrase | the vault: `PGBACKREST_REPO1_S3_KEY`, `PGBACKREST_REPO1_S3_KEY_SECRET`, `PGBACKREST_REPO1_CIPHER_PASS` | the same                                                                              |

A store that asks for more takes it in `peal_settings`: the region
requests are signed for, `PEAL_S3_REGION` and `PGBACKREST_REPO1_S3_REGION`
(both `auto` unless set, which suits R2; elsewhere the store's region,
such as `eu-west-1`), and where the bucket's name goes,
`PEAL_S3_FORCE_PATH_STYLE: true` for the path rather than the host name,
and `PGBACKREST_REPO1_S3_URI_STYLE` (`path` unless set, or `host`). Browsers
upload straight to the media bucket, so it needs the upload CORS rule
(`bun nx run peal-server:media-cors`), and a rule that aborts unfinished
multipart uploads after a day where the store has one. Never put an expiry
rule on the backup bucket.

On Cloudflare R2, a bucket's jurisdiction is chosen when it is created and
cannot change: an EU bucket is reached at
`<account>.eu.r2.cloudflarestorage.com` alone, and the account's plain
endpoint does not find it. `site.yml` refuses an R2 endpoint without `.eu.`,
a media endpoint that is not an `https://` URL, and a backup endpoint with a
scheme. Nothing in another store's endpoint says where its buckets are: once
you have checked they are in the EU, list its host in
`peal_storage_eu_hosts`, or `site.yml` refuses it too. The account's id is part of the endpoint and no secret; it goes in
each environment's `main.yml`, in place of the placeholder.

### Telegram

Alerts go to Telegram from three senders, each with a bot of its own, so a
token that leaks or is revoked silences one server, and the uptime server
holds no secret of the servers it watches:

| Sender                | Writes to                    | Its token and chat id go in                                                                  |
| --------------------- | ---------------------------- | -------------------------------------------------------------------------------------------- |
| Production's Grafana  | A channel for alerts         | `group_vars/production/vault.yml`: `peal_credentials.TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` |
| The sandbox's Grafana | A channel for the sandbox's  | `group_vars/sandbox/vault.yml`: the same two names                                           |
| The uptime server     | The channel production's use | `group_vars/uptime/vault.yml`: `uptime_credentials.TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`   |

Two bots are the least: one for both Grafanas and one for the uptime
server. The sandbox then holds the token production's alerts depend on, so
prefer three. `site.yml` requires both names on production and on the
sandbox, and `uptime.yml` on the uptime server.

Peal's own bots write to the owner directly instead: each bot's chat with
you, named after its environment ("Peal - Sandbox", "Peal - Production"),
in a Telegram folder "Peal". Press Start in the bot's chat, so it may write
to you; the chat id is then your own user id (Telegram Web keeps it in
local storage, `user_auth`), and steps 1, 4 and 5 do not apply.

1. Create two private channels, where only admins post. A channel's id does
   not change; a group's does when Telegram upgrades it.
2. For each bot, send `/newbot` to @BotFather (check its verified mark),
   then a name, then a username that ends in `bot`. Its answer holds the
   token: copy it straight into the vault, with
   `EDITOR=nano uv run ansible-vault edit inventory/group_vars/<group>/vault.yml`,
   and delete BotFather's message. `/token` issues a new one, which ends the
   old one.
3. `/setjoingroups`, **Disable**, for each bot, so nobody adds it elsewhere.
4. Make each bot an administrator of its channel, with the right to post
   messages and no other.
5. Read each channel's id in Telegram Web's address bar
   (`web.telegram.org/a/`, the number after `#`, `-100…` with its minus
   sign), rather than by calling `getUpdates`, which puts the bot's token in
   a URL, or through a third party's bot. Quote it in the vault:
   `TELEGRAM_CHAT_ID: "-100…"`.
6. After the first release, send a test from Grafana (Alerting › Contact
   points › Telegram › Test) on production and on the sandbox. Gatus has no
   test button: the uptime server's first alert, when a check fails, is its
   test.

Alerts carry rule names and labels, never log lines: Telegram is outside
the EU, so keep personal data out of any rule you add.

### Credentials

The server generates its own secrets and they never leave it. What outside
services issue reaches it in one of two ways:

- **The vault**: copy `inventory/vault.example.yml` to
  `inventory/group_vars/<environment>/vault.yml`, which Git ignores, fill it
  in, encrypt it with `uv run ansible-vault encrypt`, and add
  `--ask-vault-pass` to every run. Ansible writes the values to the server and
  never prints them. On a Mac, keep the vault's password in a password
  manager and a copy in the login keychain, which scripts can read, with no
  trusted application, so macOS asks before each read (allow it once,
  never "Always Allow"):

  ```sh
  security add-generic-password -a peal -s peal-ansible-vault-sandbox -T "" -U -w
  ```

  `security` then asks for the password, without showing it. Runs then name
  the vault and `scripts/vault-keychain-client.py`, which Ansible calls with
  the vault's id, instead of `--ask-vault-pass`:

  ```sh
  uv run ansible-playbook playbooks/site.yml --limit sandbox \
    --vault-id sandbox@scripts/vault-keychain-client.py
  ```
- **On the server**: leave the vault out and write the same values there, as
  `NAME='value'` lines, over SSH:

  ```sh
  ssh -t ops@ssh.peal.social 'sudo install -m 600 /dev/null /srv/peal/credentials.env && sudoedit /srv/peal/credentials.env'
  ssh -t ops@ssh.peal.social 'sudo install -o root -g cloudflared -m 440 /dev/stdin /etc/cloudflared/token'
  ```

For an environment that has a Pulumi stack (the sandbox), Cloudflare's
part comes from it ([`../pulumi`](../pulumi/README.md)): its Access audience
tags, its buckets and their endpoints in `group_vars/<environment>/cloudflare.yml`,
generated and committed, and the tunnel's token and the buckets' keys in its
vault. After each `pulumi up` of the environment, run

```sh
uv run python scripts/cloudflare_from_pulumi.py \
  --vault-id sandbox@scripts/vault-keychain-client.py
```

then `site.yml`. Steps 3 and 4 of [Before the first run](#before-the-first-run)
are then Pulumi's for that environment, the lifecycle and CORS rules included.

`site.yml` stops and names what is missing either way. Keep a copy of the
backup passphrase (`PGBACKREST_REPO1_CIPHER_PASS`) outside the server, in a
password manager: the backups cannot be read without it.

### A new server

1. Create it in the provider's console, from its Ubuntu LTS image, with
   your SSH key, the provider's firewall with no inbound rule, and its
   address in `inventory/hosts.yml`. See which account the image lets your
   key into ([The image's account](#the-images-account)).
2. `uv run ansible-playbook playbooks/bootstrap.yml --limit production -e ssh_via_tunnel=false`
3. `uv run ansible-playbook playbooks/site.yml --limit production -e ssh_via_tunnel=false`:
   port 22 stays open while the tunnel comes up. With the provider's
   firewall in front, open 22 there for your address for these two runs.
4. Check SSH through the tunnel: `ssh ops@ssh.peal.social true`.
5. `uv run ansible-playbook playbooks/site.yml --limit production`: Ansible
   now connects through the tunnel, and port 22 closes.
6. `uv run ansible-playbook playbooks/release.yml --limit production`.
7. Take the first backup, `ssh ops@ssh.peal.social sudo systemctl start peal-backup@full`,
   and send a test alert from Grafana (Alerting › Contact points › Telegram ›
   Test).
8. For production, once the uptime server runs: give it its heartbeat token
   ([The heartbeat](#the-heartbeat)). Until then, set `peal_heartbeat_url` to
   `""` in `group_vars/production/main.yml`: while it names the uptime
   server, `site.yml` requires the credential `PEAL_HEARTBEAT_TOKEN`.

### The image's account

`bootstrap.yml` logs in once, with your key, as the account the server's
image lets in, `bootstrap_user`, and creates `ops`, which every other
playbook logs in as. Images come in two kinds:

| The image lets your key into                                | Set                            | Then                                                                                                                                         |
| ----------------------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| root                                                        | nothing: `root` is the default | `site.yml`, or `uptime.yml`, turns root's logins over SSH off                                                                                |
| an account of its own with sudo, such as `ubuntu`, not root | `bootstrap_user: ubuntu`       | The bootstrap uses sudo, which that account has without a password. `site.yml`, or `uptime.yml`, removes it, with its home and its sudo rule |

Set `bootstrap_user` in the group's `main.yml`, so every later run knows
which account to remove, rather than with `-e`. The provider's page for
the image names the account it lets your key into.

The image's own account holds your key and sudo without a password, so it
goes once `ops` works: the `ssh` role, which runs as `ops` with sudo,
removes it right after it has confirmed `ops`'s keys and sudo rule, then
lets `ops` alone in over SSH. cloud-init makes that account once per
instance, not at each boot. A server made again from a snapshot is a new
instance, where it comes back: run `site.yml`, or `uptime.yml`, after
restoring one.

Some images also have cloud-init write `/etc/hosts` again at every boot
(`manage_etc_hosts`), with the name the provider gave the server. The
`system` role turns that off in a settings file cloud-init reads after the
image's own, `/etc/cloud/cloud.cfg.d/zz-peal.cfg`, and writes the server's
line in cloud-init's template for the file too, since a provider that sends
the setting at boot overrides any file on the server: the hosts file then
names the server the same either way, and a run after a reboot reports no
change. On an image without cloud-init, both steps are skipped.

### Without the tunnel

Once the tunnel carries SSH, port 22 is closed, and no account has a
password: when the tunnel stops for good (its token revoked, cloudflared
broken), the provider's rescue system is the way back in.

1. Open port 22 to your address alone in the provider's firewall.
2. Boot the server into the rescue system, mount its disk, and set
   `ENABLED=no` in its `etc/ufw/ufw.conf`: ufw then stays off when the
   server starts. Boot the server from its disk again.
3. `ssh ops@<address>` answers, with your key. Run
   `site.yml --limit production -e ssh_via_tunnel=false`, which turns ufw
   back on with port 22 open, rate limited, and writes the tunnel's routes
   again, and its token when the vault holds a new one.
4. Once `ssh ops@ssh.peal.social true` works again, run `site.yml` without
   the setting, which closes port 22, and close it in the provider's
   firewall.

### A sandbox on a machine of your own

Until the sandbox has a server of its own, it can run in a VM on a machine
you keep: Ubuntu 24.04 or 26.04 at 4 GB of memory or more, nothing of the
host mounted in it, its sshd forwarded to the host's loopback alone, and
your key let in as root, once, for the bootstrap. Its settings stay off
Git, in `inventory/host_vars/peal-sandbox/local.yml` (Git ignores
`host_vars/*/local.yml`), which outrank the group's:

```yaml
ansible_host: 127.0.0.1 # the forwarded sshd, on the VM's host
ansible_port: 60122
ansible_ssh_common_args: -o ProxyJump=<the host, as your SSH config names it>
ssh_via_tunnel: false # only the host reaches the VM's port 22
hosting_provider: home
hosting_location: <city>
admin_ssh_public_keys: [ssh-ed25519 AAAA… ops]
ssh_allow_users_extra: [<the VM manager's account in the VM>]
```

A VM manager such as Lima reaches its VM over SSH as an account of its own,
to run it: `ssh_allow_users_extra` keeps sshd letting it in beside `ops`.

SSH then never moves to the tunnel: run every playbook as for a server
whose tunnel carries SSH, without `-e ssh_via_tunnel=false`, and leave out
the steps that check or close it. Everything else is the sandbox's own: its
tunnel, Access applications, buckets and credentials. A VM on an Arm host
is Arm: a server of the other architecture takes the sandbox afresh, not
its backups ([Architecture](#architecture)).

## Releases

`release.yml` checks the commit out from GitHub on the machine running
Ansible, builds there the images of the four (`peal-server`, `peal-web`,
`peal-static` with the environment's site and docs URLs, and `peal-postgres`,
named after its Dockerfile) that the server does not have yet, and uploads
them over SSH. An image the server has is never uploaded again, so Postgres's
changes, and Postgres restarts, only when its Dockerfile does. The servers
hold no repository or registry credentials, and only pushed commits can be
released. Then, on the server:

1. when Postgres is to restart, because its image or its settings changed,
   the old server stops first, with 75 seconds to finish its calls to the
   platforms;
2. Postgres starts, and keeps the database password in step with
   `secrets.env`;
3. the new server starts and applies its migrations before it listens;
4. the rest of the stack starts, and the release is checked on the server and,
   for production, through the tunnel.

Release the sandbox first. To roll back, release the previous commit. Images
no container uses are removed once they are a week old, counted from when
they were built: an older release's are built and uploaded again. Migrations
do not run backwards, so write each one so that the release before it still
runs against it.

Every container of the stack runs on a read-only file system, writing only
to its volumes and to small tmpfs mounts, and none gains privileges it was
not started with.

## Backups

Postgres archives each write-ahead log segment to the backup bucket as soon as
it fills, or after 5 minutes. `peal-backup` takes a full backup on Sundays and
a differential one the other days, at 02:15 UTC, and pgBackRest keeps four
full backups with what they need: point-in-time recovery over the last three
weeks at least, four just before a Sunday's backup expires the oldest, with
at most 5 minutes lost. Backups are compressed and encrypted with the backup
passphrase before they leave the server. Each one that finishes reports to the
collector, and Grafana alerts when none has for 30 hours, and when the disk is
85% full, as a stuck archive would make it.

pgBackRest rather than WAL-G: it comes from the PostgreSQL project's signed
apt repository, which the official Postgres image already trusts, at an exact
version and for both architectures, while WAL-G would be a binary checked by
hand-kept digests; it releases more often (2.60.0 in October 2026); and its
`check`, `info` and `verify` commands, retention by full backup and
`--type=time` restores make the runbook short.

Deleted data leaves the backups once the oldest backup that holds it expires,
within five weeks. A restore brings back the accounts and workspaces deleted
after its point in time. The server records each of those deletions outside
the database, by id, in the media bucket (`erasures/`, kept 42 days), and
[the runbook](runbooks/restore-database.md#deletions-since-the-restore-point)
applies them again before the server starts.

Media live in R2 and are not backed up again; telemetry is not backed up. The
secrets are on the server only: [restoring onto a new server](runbooks/restore-database.md#a-new-server)
says what that costs.

[`runbooks/restore-database.md`](runbooks/restore-database.md) restores the
database, to its latest state or to a time.

## Uptime

A separate server watches production and the sandbox from outside, as
people reach them, with [Gatus](https://github.com/TwiN/gatus): if
Cloudflare, the tunnel or a server is down, its alerts still go out. It is
not linked to them: no tunnel, no private network, and no secret of theirs.
It is at another provider than theirs, and in another city: another
company's network, console and account, which an outage or a suspension
takes whole, and another power supply. The `uptime` role refuses to run
while its `hosting_provider` or `hosting_location` is one production or the
sandbox has, and [`tests/test_hosting.py`](tests/test_hosting.py) checks
the inventory.
`uptime.yml` sets it up with the same roles (`ops`, key-only SSH, ufw,
unattended upgrades, Docker), then the `uptime` role runs Gatus and Caddy in
Docker, each pinned by digest, as the Compose project `uptime` in
`/srv/uptime`.

### What it checks

Gatus's configuration is generated from the inventory: `uptime_environments`
in `group_vars/uptime/main.yml` lists each environment's public host names
(kept equal to its `peal_hostnames` by `tests/test_uptime.py`), and the
role's defaults the checks, every minute unless said otherwise:

| Check                    | Passes when                                                           |
| ------------------------ | --------------------------------------------------------------------- |
| The site (`/`)           | 200 within 1 second                                                   |
| The docs (`/`)           | 200 within 1 second                                                   |
| The web app (`/sign-in`) | 200 within 2 seconds                                                  |
| The API (`/api/ready`)   | 204 within 1 second: the server answers, and its database too         |
| Each host's certificate  | Valid for 14 more days, the uptime server's own included (hourly)     |
| Each host's DNS          | An A record through Quad9 (`9.9.9.9`), outside Cloudflare (5 minutes) |
| Each Grafana heartbeat   | One in the last 15 minutes ([The heartbeat](#the-heartbeat))          |

A redirect fails a check, so a page that sends people to Cloudflare Access's
sign-in never passes for the page. The sandbox is behind Access throughout:
its checks carry a Cloudflare Access service token, which the sandbox's
Access application lets in with a Service Auth policy. Telegram hears of a
page or the API after 3 failures in a row, and that it is back after 2
successes; of a certificate, a host name or a heartbeat at once.

### Set it up

The server costs money, so it needs the owner's approval, like any paid
resource. Then:

1. Create it in the console of a provider other than production's, in
   another city, with your SSH key and a firewall that lets in
   port 443 from anywhere and port 22 from the addresses you work from. Put
   its address in `inventory/hosts.yml`, and its provider and city in
   `group_vars/uptime/main.yml`.
   Give it a name, `uptime_hostname`, with A and AAAA records that Cloudflare
   does not proxy, so it answers even when Cloudflare does not, and the
   status page its own, `uptime_status_hostname` ([The status
   page](#the-status-page)).
2. Make its credentials, which are its own:
   - its Telegram bot, and the id of the channel it writes to, which may be
     the one production's alerts go to ([Telegram](#telegram)):
     `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`;
   - a Cloudflare Access service token for the sandbox's checks (Zero Trust ›
     Access › Service credentials), valid a year: its client id and secret,
     shown once, are `SANDBOX_ACCESS_CLIENT_ID` and
     `SANDBOX_ACCESS_CLIENT_SECRET`, named after the environment. Add a
     policy with the action Service Auth that includes that token alone,
     not any service token of the account, to the sandbox's Access
     application, the one that covers its app, site and docs, and to no
     other. When the token expires, every check of the sandbox fails at
     once: refresh it before, which keeps its id and secret.

   Put them in `inventory/group_vars/uptime/vault.yml`, from
   `inventory/vault.uptime.example.yml` and encrypted like the others, or
   write them on the server, as `NAME='value'` lines, after step 3 (the
   folder is the one `uptime.yml` makes, with the same owner and mode):

   ```sh
   ssh -t ops@uptime.peal.social 'sudo install -d -m 750 /srv/uptime && sudo install -m 600 /dev/null /srv/uptime/credentials.env && sudoedit /srv/uptime/credentials.env'
   ```

3. `uv run ansible-playbook playbooks/bootstrap.yml --limit uptime`, once
   `bootstrap_user` names the account its image lets in, if not root
   ([The image's account](#the-images-account)).
4. `uv run ansible-playbook playbooks/uptime.yml --check --diff`, then without
   `--check`. Caddy gets a Let's Encrypt certificate for `uptime_hostname`,
   and `uptime_status_hostname`, through the TLS-ALPN challenge, on port 443
   alone.
5. Give production its heartbeat token, below.

### The heartbeat

Production's Grafana has a rule that always fires, whose notifications go to
the uptime server instead of Telegram, every 5 minutes or so
(`peal-docker/config/production/grafana/alerting/heartbeat.yaml`). When they
stop, Grafana, Prometheus, or the way out is down, so production's own
alerts may not reach anyone either, and the uptime server says so after 15
minutes. Grafana posts them to `peal_heartbeat_url`, a Gatus external
endpoint, with a bearer token that Gatus takes for that endpoint alone.

The token follows the credential rules. The uptime server generates it, once,
in `/srv/uptime/secrets.env` (`PRODUCTION_HEARTBEAT_TOKEN`), and keeps it
there; for production it is a credential an outside service issued,
`PEAL_HEARTBEAT_TOKEN`, which `site.yml` checks by name only. Nothing else
passes between the two servers. Carry it from one to the other through your
own machine:

- into production's vault: read it with
  `ssh ops@uptime.peal.social sudo grep PRODUCTION_HEARTBEAT_TOKEN /srv/uptime/secrets.env`,
  and put the value in `group_vars/production/vault.yml` as
  `PEAL_HEARTBEAT_TOKEN`;
- or on production's server, without showing it: once
  `/srv/peal/credentials.env` lacks the line,

  ```sh
  ssh ops@uptime.peal.social sudo sed -n "s/^PRODUCTION_HEARTBEAT_TOKEN=/PEAL_HEARTBEAT_TOKEN=/p" /srv/uptime/secrets.env \
    | ssh ops@ssh.peal.social 'sudo tee -a /srv/peal/credentials.env > /dev/null'
  ```

Then run `site.yml` on production, which writes the heartbeat's settings to
`host.env`, and `release.yml`, which restarts Grafana with them. To change
the token, delete its line on the uptime server, run `uptime.yml`, which
makes another, and give production the new one.

### The dashboard

Gatus's dashboard listens on the uptime server's 127.0.0.1 only. SSH lets
`ops` forward a local port to it, and to nothing else:

```sh
ssh -N -L 8080:127.0.0.1:8080 ops@uptime.peal.social   # then open http://localhost:8080
```

On `uptime_hostname`, Caddy answers the heartbeats' path and nothing else:
`/api/v1/endpoints/<group>_<name>/external`, by POST, and 404 to the rest.

### The status page

The owner chose to publish the dashboard as Peal's status page, at
<https://status.peal.social>: `uptime_public_status: true` and
`uptime_status_hostname: status.peal.social` in `group_vars/uptime/main.yml`.
On that name, Caddy serves the dashboard and API of a Gatus of its own,
`status`, by GET and HEAD alone, and answers 405 to any other method
(`status.caddy`): the page takes no heartbeat, and the heartbeats keep
`uptime_hostname`, so production's `peal_heartbeat_url` does not change.
That Gatus checks the customer-facing endpoints (site, docs, web app, API)
of the environments `uptime_environments` marks `public` (production
alone; one behind Access cannot be), with no alert and no secret, and shows
no URL, condition or error (`status-config.yaml.j2`). The sandbox, the
certificate and DNS checks and the heartbeats stay on the private
dashboard. The uptime Gatus checks the page's certificate hourly, as it
does `uptime_hostname`'s.

It needs one DNS record in the `peal.social` zone, made before `uptime.yml`
runs, or Caddy gets no certificate for it:

| Type  | Name     | Content              | Proxy status                         |
| ----- | -------- | -------------------- | ------------------------------------ |
| CNAME | `status` | `uptime.peal.social` | DNS only (not proxied by Cloudflare) |

Not proxied, as `uptime_hostname` is: the page then answers even when
Cloudflare does not, and Caddy's TLS-ALPN challenge reaches the server. A
CNAME follows the uptime server's A and AAAA records, so a new address
changes one record. To take the page down, set `uptime_public_status: false`
and run `uptime.yml`; Caddy then serves `uptime_hostname` alone, and the
record can go.

### On the uptime server

| Path                          | What it holds                                                                    |
| ----------------------------- | -------------------------------------------------------------------------------- |
| `/srv/uptime/compose.yaml`    | The stack: Gatus on 127.0.0.1:8080, Caddy on port 443                            |
| `/srv/uptime/gatus/`          | Gatus's configuration, which holds no secret: Gatus reads them from its settings |
| `/srv/uptime/caddy/`          | Caddy's configuration: the heartbeats' routes, and the status page's             |
| `/srv/uptime/data/`           | Gatus's history, a SQLite database the `gatus` user owns                         |
| `/srv/uptime/status/`         | The status page's Gatus's configuration: public checks alone, no secret          |
| `/srv/uptime/status-data/`    | The status page's history, which the `gatus` user owns                           |
| `/srv/uptime/secrets.env`     | The heartbeat tokens, generated there                                            |
| `/srv/uptime/credentials.env` | What outside services issued: the Telegram bot and the Access service token      |

`uptime-compose` runs Docker Compose on the stack: `sudo uptime-compose ps`,
`sudo uptime-compose logs --tail 50 gatus`.

## Docker Engine

Docker Engine, Compose, containerd and Buildx are installed at the exact
versions `docker_packages` names (`roles/docker/defaults/main.yml`), and an
apt pin holds them there, so neither the daily security updates nor the
system role's upgrade moves them. To bump them, list the versions Docker
publishes for the servers' Ubuntu release, as the comment there shows, put
the new ones in `docker_packages`, read Docker Engine's release notes, then
run `site.yml` with `--check --diff` and apply it on the sandbox, then
production, then the uptime server. The engine restarts, and the containers
with it unless the bump is a patch release, so release in a quiet hour.

## Idempotency

A second run of `site.yml` reports no change:

- Packages, users, keys, files, templates, units and ufw rules declare a
  state, which modules leave alone when it holds. The package upgrade reads
  the cached lists for an hour.
- Templates for sshd, sudoers and cloudflared's routes are validated before
  they replace the live files; `sshd -t` runs again on the whole
  configuration and reports no change.
- The swap file is created only when `/swapfile` is missing, and the secrets
  only when `secrets.env` is (`creates`). The swap file is made under another
  name and renamed once it is a swap area, so a run cut short leaves none
  half made.
- cloudflared's package is downloaded only when its digest differs, and
  installed only when that version is not.
- The credentials check reads names, never values, and changes nothing.
- On the uptime server, a heartbeat token is generated only when
  `secrets.env` lacks it, and Compose recreates a container only when its
  image or its configuration changed, which a label holding its digest
  tells.
- Handlers restart sshd, journald, Docker or cloudflared only after a change;
  cloudflared's restart is scheduled a few seconds out, and Ansible waits for
  its connection, which may run through the tunnel.

`release.yml` changes what a release changes. Run again for the same commit,
it builds and uploads nothing (the images are on the server), creates no
Bluesky key (one is in `secrets.env`), leaves the database password alone
(the server's is accepted, over the network as the server signs in), and
Compose recreates nothing. What it reads of the running containers is their
image and settings' hash, never their environment, which holds secrets.
