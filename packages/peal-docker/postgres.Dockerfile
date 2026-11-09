# syntax=docker/dockerfile:1.28.0@sha256:bb22d9815c728170f72750f4e5b0d672e06176142e1d602c7e66c050100b7e5b

# The production Postgres: the official image with pgBackRest, which archives
# the write-ahead log and takes backups to an S3-compatible bucket (Cloudflare
# R2 in Peal's production). Build it from the repository root:
#
#   bun nx run peal-docker:build-postgres-image
#
# pgBackRest is configured by PGBACKREST_* variables (compose.production.yaml)
# and runs as the postgres user, from Postgres's archive_command and from
# `docker compose exec`. The Debian image is used rather than Alpine because
# pgBackRest comes from the PostgreSQL project's apt repository, which the
# image already trusts, at an exact version.
FROM postgres:18.6-trixie@sha256:e3d24f6906d0760bf4da0dae872415391ededefad23fd471c47dc53b0ddf3c42

# ca-certificates: pgBackRest checks the bucket's TLS certificate.
RUN apt-get update && \
    apt-get install --yes --no-install-recommends \
      ca-certificates=20250419+deb13u1 \
      pgbackrest=2.60.0-1.pgdg13+1 && \
    rm -rf /var/lib/apt/lists/*
