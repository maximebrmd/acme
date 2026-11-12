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
  under the workspace's advisory lock): `PlanLimitReached`
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
  (`use-cases/arrived-file.ts`: `roomIn`, `storeArriving`, `recordArrived`),
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
- Imports from a link run two at once per workspace and eight per process
  (`ImportSlots`, `importsAtOnce`); past it the answer is `MediaImportBusy`
  (429), to retry.
