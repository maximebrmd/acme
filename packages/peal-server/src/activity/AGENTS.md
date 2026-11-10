# Activity

- The activity context keeps two things about requests, in its own schema:
  `activity.request_counts`, the rate limit's windows (a subject's SHA-256,
  a window, a count: they name nobody, and the hourly
  `activity.request-counts` cron deletes those an hour past), and
  `activity.events`, each workspace's activity log.
- An event (`ActivityEvent`) is metadata only: when, the operation
  (`<group>.<endpoint>` from the contract, or `mcp.<tool>`), the status and
  the error's code, the actor (a user or a key), how they authenticated
  (`session`, `apiKey`, `oauth`, `mcp`, `partnerKey`, `connectLink`), the
  key or the OAuth client with
  the name it had then (`ApplicationNames`, backed by the workspace
  context's `CredentialNames`), whether staff acted as the member (never
  who), the ids the path named (id-shaped values only) and the request id.
  Never a body, a text, a URL's query, an address or a user agent.
  `actor_kind`, `via` and operations are persisted names: add, never rename.
- A partner key acting in a workspace its partner owns is an `apiKey`
  actor by its own id, through `partnerKey`, and a connect link that
  connected accounts the key it stands as (`connect-link:<id>`,
  `linkKeyOf`), through `connectLink`, under `hostedConnect.complete` or
  `.choose` (`ConnectLinkJournal`, which the composition root backs with
  `LoggedConnectLinkJournal`): never anything of the visitor. A partner
  key may hold `activity:read`, as a workspace without members has no
  owner to read its log. The partner API's `createWorkspace` and
  `updateWorkspace` are kept in that workspace's log by their handlers
  (`recordMade`), as its path is not under the workspace. Its refusals say
  why, like any other: `missingScope` with the partner scope a key lacks.
- A check leaves no event: `posts.validate` and `lookups.run`, which read
  though they are sent as POST (`checksOnly` in
  `#workspace/api/security.ts`), and a request whose handler says first
  thing that it changes nothing (`changesNothing`, `#shared/api/change-mark.ts`:
  an import's dry run), which the ConnectionJournal leaves out too. A
  request that makes several posts (`posts.bulk`, `posts.import`) is one
  event; its refused items carry their errors' codes (`inEnvelope`,
  `#publishing/api/post-refusal.ts`).
- `ActivityLog.list` needs `activity:read`, which owners alone hold (an
  admin holds everything else but deleting the workspace); `GET
  …/activity` pages newest first by `cursor`, as the other lists do, and
  `peal activity list` and the MCP tool `list_activity` read the same.
- Events are kept 90 days (`activity/domain/activity-retention.ts`, the
  daily `activity.retention` cron, the `activityLog` period of the
  data-processing registry and the privacy policy's table: change them
  together). `ActivityRecords` erases a workspace's, clears a closed
  account's id and application from the events its user made and from
  other events' object ids, and exports a user's own. A successful
  `workspaces.delete` records nothing: its log went with it.
- Tests set the clock before 1970 when Postgres is in the layer (the pool's
  periodic sleeps run for every second the test clock moves forward).
