# Compose files and telemetry

Running the development stack is in the root [`AGENTS.md`](../../AGENTS.md),
under Development stack.

## Compose files

- In `packages/peal-docker/compose.yaml`, pin every image to an exact
  version, publish ports on 127.0.0.1 only, give every service a health
  check, and use synthetic credentials.
  `packages/peal-docker/test/compose.test.ts` enforces these rules, and checks
  that the server image uses the Bun in `.bun-version`, runs as nonroot, ships
  ffprobe, and pins every image it builds on or copies from by digest.
- Mount no image (`type: image`): Docker mounts the image when it creates
  the container and not again after its daemon restarts (a reboot, an engine
  upgrade), so the container restarts on an empty folder. A binary an image
  lacks, such as the collector's health-check wget, comes from a one-shot
  service that copies it into a named volume the service mounts read-only
  and waits for (`condition: service_completed_successfully`). A one-shot
  service has no health check, and in production `restart: "no"` and
  `network_mode: none`.
- `compose.production.yaml` follows the same rules, pins every image it pulls
  by digest at the version `compose.yaml` runs, gives every long-running service
  `restart: unless-stopped` and the server `stop_grace_period: 75s`, and tags
  the images it builds `${PEAL_VERSION:-local}` (`PEAL_POSTGRES_VERSION` for
  Postgres). It passes optional settings through by name (`NAME:` with no
  value), so one that is unset stays unset rather than empty, which the
  server would read as set, and names every server setting the docs'
  environment variables page lists: a container sees no other. A setting
  inside a `command` (Postgres's `PEAL_POSTGRES_*`) needs a default there:
  PostgreSQL's own, and a change to one recreates Postgres at the next
  release. A `-c` flag overrides `ALTER SYSTEM` and `postgresql.conf`, so a
  value set there for those four is lost once Compose passes the flag: the
  docs tell operators to move it to the variable. Keep `shm_size` above
  `maintenance_work_mem`, which a parallel vacuum may take in `/dev/shm`. Every service
  runs `read_only` with `no-new-privileges`, writing to its volumes and tmpfs
  mounts only. The same test covers it, the web, static and
  Postgres images (CI's Node, the workspace's Bun, digests, nonroot) and
  `compose.self-host.yaml`, where Caddy alone publishes ports to the world.
- Keep `MP_SMTP_DISABLE_RDNS` on Mailpit, in compose and CI: its reverse DNS
  lookup otherwise stalls each SMTP greeting for about 10 seconds, and the
  email tests time out.

## Telemetry and alerting

- Telemetry goes through an OpenTelemetry Collector to Loki, Tempo, Prometheus
  and Grafana; alerts go to a Telegram bot. Grafana's alert rules
  (`config/production/grafana/alerting/rules.yaml`) and dashboards
  (`config/production/grafana/dashboards/`) are provisioned from
  `peal-docker`; the web app's error reports have an alert and a dashboard
  of their own, and the server's error-log alert leaves them out. The
  heartbeat rule (`alerting/heartbeat.yaml`) is apart: it always fires, to
  its own contact point, never to Telegram.
- A rule queries a server metric by its Prometheus name: dots become
  underscores, and a counter declared `incremental: true` (a monotonic sum)
  gains `_total`; Effect exports no unit, so a gauge gains no suffix.
  `packages/peal-server/test/app/metric-names.test.ts` exports every metric
  `src/` declares through the server's OTLP export and fails on a rule
  name none of them takes.
- A counter born at its first event has no earlier sample, so
  `increase` never sees it: alert on a state (a gauge the job sets each
  run), or on `sum(c) - (sum(c offset 1h) or vector(0))`, and set the
  job's gauges when the server starts. The billing rules are run through
  promtool in the production image (`test/alerting-promtool.test.ts`,
  skipped without Docker): add a case with a rule.
- The backup and disk rules read gauges the host posts to the collector
  (the Ansible roles `peal_backup` and `peal_disks`), not the stack's own
  telemetry. A self-hoster's server without those roles never posts them:
  `peal-raid-degraded`, `peal-disk-failing` and `peal-backup-failed` take
  no data as `OK` (`peal-backup-stale` does not: a server that never backed
  up alerts), and read the names the roles' scripts post, which
  `packages/peal-infra/ansible/tests/test_disks.py` and `test_backup.py` tie
  to the rules; `test_backup.py` also runs the failure rule in promtool.
- Telemetry keeps logs 31 days (Loki), traces 14 days
  (`config/production/tempo.yaml`, whose `block_retention` is set for both
  the backend scheduler and worker) and metrics 30 days, as the privacy
  policy says: change both together.
