# API contract

- The API only grows: add a field, an operation, an enum value or an error,
  never rename, remove or tighten one. `nx run peal-sdk:test` (in `bun run
  test`) compares the SDKs' document with the last released one
  (`packages/peal-sdk/released/openapi.json`, `scripts/api-changes.ts`) and
  fails on anything a client could break on; a break that is decided on goes
  into `released/accepted-changes.json` with its reason (the 64-bit
  byte counts are there: the same number on the wire, a wider type in the
  typed SDKs). It also refuses a tighter limit on what is sent, a way of
  signing in that goes, a value or a union member no longer answered,
  null where there was always a value, and a baseline that lists nothing
  or is not the one the last release recorded (`released/openapi.sha256`).
  The target runs through `nx:run-commands`: `commands` outside `options`
  makes an `nx:noop` target that passes without running. Deprecate with
  `.annotateMerge(deprecated({ since, sunset?, link? }))`
  (`peal-contract/deprecation`): the document marks it and every answer
  carries `Deprecation` (RFC 9745) and `Sunset` (RFC 8594). `GET
  /api/changelog` serves `api-changelog.json`, which only `bun
  scripts/compat.ts --release --date … --title …` (in `packages/peal-sdk`)
  writes, when the SDKs are released: it records what changed and makes the
  current document the released one.
- Every contract error spreads `errorEnvelope` first, and its `code` is its
  tag in snake case (`errorCodeOf`): a tag never changes once published.
  The server's guide says how answers are shaped
  ([HTTP API and middlewares](../peal-server/AGENTS.md)).
