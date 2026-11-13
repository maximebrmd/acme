# Media

- Clients upload straight to the store with presigned PUTs, so files never
  pass through the API: one request up to 16 MiB, 8 MiB parts above that.
  Single PUTs sign `content-type`, `content-length` and `if-none-match: *`;
  never use presigned POST, which R2 lacks.
- `POST …/media/:id/complete` lists and joins the parts, checks the stored
  size and type, then probes the file at once: sharp for images (real format
  checked against the declared one), ffprobe for videos. `ready` means probed;
  an `uploaded` asset carries its probe state (`pending`, `unavailable`, or why
  the probe failed).
- Accepted media: JPEG, PNG, GIF and WebP images up to 16 MiB; MP4 and
  QuickTime videos up to 1 GiB; PDF documents up to 100 MiB and 300 pages
  (`media/domain/media-format.ts`). Publishing
  checks per-platform limits when a post is scheduled.
- A PDF is the `document` kind, which only a platform whose rules list
  `application/pdf` takes (LinkedIn, alone in its post); a platform
  without media rules refuses it too. It is probed without a PDF library
  (`pdf-pages.ts`: the header, and the `/Count` of the page tree's root,
  the last one written, in the clear or in an inflated object stream,
  never a count of page objects, which strings, comments and earlier
  revisions repeat); pages that cannot be told are none, not a refusal.
  The file is read once, in slices that yield (`sliceBytes`), with bounds
  on object streams and on what they inflate to: keep every reader of
  uploaded bytes linear and interruptible, as a synchronous loop holds the
  whole server and no timeout fires in it. Never render or open a
  document: store it, hand it over.
- On a server that bills, `createUpload` checks the declared size against
  the plan's media storage (`StorageAllowance`) before the store opens an
  upload, and again as the asset is recorded (`MediaAssets.insertWithin`,
  under the workspace's advisory lock, then the pool's, `sharedWith`, run
  in the transaction): the billing account's allowance, against what its
  pool stores (`pooledRoom`), per-account pricing's growing with the
  accounts connected (`ChannelUsage`): `PlanLimitReached`
  `mediaStorage`. Rejected files count for nothing, pending ones until
  their URLs expire.
- Storage keys are `media/<workspace id>/<asset id>.<ext>` under
  `PEAL_S3_KEY_PREFIX`, and never change. Keep presigned URLs out of logs and
  errors.
- The S3 adapter uses the AWS SDK v3 (Bun's client cannot presign parts).
  Keep its checksums at `WHEN_REQUIRED`: the default puts an empty-body CRC32
  in presigned URLs, which stores refuse.
- Members reach media through `MediaLibrary`, which checks their
  permissions; publishing jobs through `MediaForPlatforms`, which checks
  none, as they act for the workspace once a post is scheduled, and hands out
  only ready assets of that workspace (`MediaNotPublishable` otherwise).
- `POST …/media/import` (`importMedia`, media:upload) fetches a file through
  `RemoteMedia` (`HttpRemoteMedia`: `publicHttpClientWith`, so the
  OutboundGuard checks the address and each of three redirects at most, no
  credentials, never logging the address), reads its format from its first
  bytes (`sniffContentType`), never the host's content type, counts bytes as
  they arrive against the kind's limit and the plan's storage, stores them
  in parts (`MediaStorage.store`, one part in memory), records the asset
  under the workspace's lock, then completes and probes it as an upload.
  The whole import has `importTimeout` (90 seconds, under the proxy's 120).
  A caller that takes only some kinds names them (`kinds`, as a feed's
  pictures take images): another is refused from its first bytes
  (`UnsupportedMediaType`), before anything is stored.
  Tests reach a loopback host with `mediaWith` and an open guard.
- An image the writing assistant made is the third way a file arrives
  (`storeGenerated`, media:upload): the import and it share the second half
  (`use-cases/arrived-file.ts`: `roomIn`, `storeArriving`, `keepArriving`),
  never a copy of it. Only an image is taken; the bytes are stored as the
  provider gave them, never re-encoded, the asset is marked
  (`aiGenerated`, `media.assets.ai_generated`, set at creation only) and
  gets no description, and bytes the probe cannot make `ready` are deleted
  (`GeneratedImageUnusable`). `roomForImage` checks the plan's storage for
  the largest image beforehand, so a full plan spends nothing.
- Deleting an asset asks the `MediaUsage` port first, which publishing's
  `MediaInPosts` backs (`PublishingMediaUsage`; the composition root
  provides `MediaInPostsLive`): a post scheduled or publishing that shows it
  refuses the deletion (`MediaInUse`, listing the posts), and drafts lose
  the attachment in one transaction. `GET …/media/:id/usage` tells clients
  beforehand.
- A file that arrives (an import, an image the assistant made) is stored
  and recorded through `keepArriving`: from the moment the store holds it
  to its asset's insert nothing interrupts it, and any failure there takes
  it out of the store. Never put a step that can fail between the two.
- Imports from a link run two at once per workspace and eight per process
  (`ImportSlots`, `importsAtOnce`); past it the answer is `MediaImportBusy`
  (429), to retry.
- A file keeps its name (`media.media_assets.file_name`, `fileNameOf` in
  `domain/file-name.ts`): the last segment of what `createUpload` is given
  (never a folder), or of the path of the address an import was served
  from after its redirects (`nameInAddress`: never the query, and none for
  a segment without an extension or that looks like a token), composed
  (NFC), without the characters that show nothing (zero-width, tags), on
  one line through `storableLine`, at most 255 characters
  (`maxFileNameLength`, the contract's `maxMediaFileNameLength`). Outside
  text never makes it fail: what cannot be a name is none. An image the assistant made has
  none, and so does every file stored before the release that added
  names, which no source can name: clients show the kind instead. Set at creation only;
  never in logs, webhook events or what goes to a platform; in the
  workspace's export.
- `MediaAssets.list` takes `text` (in the name or the description, ILIKE
  with its wildcards escaped, cleaned and composed by `searchTextOf` in
  `listMedia`) and `kind` (the kind's content types), and orders by `id
  DESC NULLS LAST`, as the workspace's indexes are written: a bare `DESC`
  is `NULLS FIRST`, which no workspace index gives, and Postgres then reads
  the primary key backwards across every workspace
  (`drizzle-media-assets.test.ts` reads the plans). The text is found
  through pg_trgm's GIN indexes on both columns (the extension comes from
  the custom migration `media-trigrams`), the kind through `(workspace_id,
  content_type, id)`. Read on a scale database (`seed-scale.ts`: 500,000
  files, one workspace of 100,000): a page, a kind or a common word in
  under a millisecond from the workspace's indexes; a rare text 1.5 to 3
  ms from the trigrams, up to about 30 ms when its trigrams are common
  across every workspace's files; text under three characters has no
  trigram and walks the workspace's files, about 30 ms for no match in
  100,000.
- Four hourly `ClusterCron`s sweep the store (`MediaSweeps`,
  `infrastructure/crons.ts`), each bounded (`PEAL_MEDIA_SWEEP_BATCH`, 500 a
  run; ten pages) and safe to run again; one thing the store refuses is
  counted and skipped, never blocking the rest. `PEAL_MEDIA_SWEEPS`
  (`on` in production, `off` elsewhere) switches them all: off, nothing
  is listed. `media.pending-sweep` takes assets pending since
  `PEAL_MEDIA_SWEEP_PENDING_AFTER` (a day): one a scheduled post shows is
  paged past; otherwise the row goes first, only while still pending
  (`forgetExpired`), then `MediaUsage.release` (drafts), then the upload
  and the file. `media.upload-sweep` aborts multipart uploads open since
  `PEAL_MEDIA_SWEEP_UPLOADS_AFTER`. `media.orphan-sweep` deletes files the
  store dated `PEAL_MEDIA_SWEEP_ORPHANS_AFTER` ago that no asset holds, or
  a rejected one, checking each key again before it goes, and stops
  deleting nothing (`breaker`) on a page with more unheld files than
  `PEAL_MEDIA_SWEEP_ORPHANS_LIMIT` (100) or a fifth of 50 old ones.
  `media.folder-sweep` empties the folders of erased workspaces
  (`media.erased_folders`, written in the erasure's transaction by
  `MediaRecords.eraseWorkspace`, deleted once emptied; 15 minutes' grace),
  leaving one whose workspace still has assets, so a store that fails
  after an erasure commits never keeps its files. Ages must be finite and
  at least the part URLs' six hours and an hour (`minimumSweepAge`).
- The pending and orphan sweeps delete what this database does not know
  of, so they run only while `<prefix>media/.owner` names this database's
  id (`media.store_identity`, made once, kept through restores): the first
  run writes it create-only; another id (`foreign`) or none once claimed
  (`unmarked`) stops them. Never replace the marker but through
  `claimMediaFolder` (`bun src/claim-media-folder.ts`, `nx run
  peal-server:media:claim`), an operator's act. A restore keeps the id:
  the restore runbook turns the sweeps off until the restore is final.
- Listing sweeps keep where they stopped (`media.sweep_cursors`, keys
  relative to the prefix). `MediaBucket` lists `<prefix>media/` only and
  hands out only what `mediaKeyOf` reads as a key Peal writes: never widen
  either, the erasure ledger and other instances share the bucket.
  Metrics `peal.media.sweep.{objects,bytes,failures}` (by `sweep`, counted
  as each goes; each key at debug) and `peal.media.sweep.refusals` (by
  `sweep` and `reason`); alerts `peal-media-sweep-failing` and
  `peal-media-sweep-refused`.
- Sweep tests (`test/media/infrastructure/media-sweeps.test.ts`) give the
  sweeps a prefix of the run's own and delete it after, and forget the
  database's claim and cursors; rows they sweep are dated before 1970,
  which no other suite writes.
