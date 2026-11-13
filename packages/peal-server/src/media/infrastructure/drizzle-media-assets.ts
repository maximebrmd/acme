import { and, desc, eq, gt, inArray, lt, or, sql } from "drizzle-orm";
import { DateTime, Duration, Effect, Layer, Option, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { MediaAssetNotFound } from "#media/application/media-asset-not-found.ts";
import { MediaAssets } from "#media/application/ports/media-assets.ts";
import type {
  MediaPage,
  MediaPageRequest,
} from "#media/application/ports/media-assets.ts";
import type { AltText } from "#media/domain/alt-text.ts";
import type { MediaAssetId } from "#media/domain/media-asset-id.ts";
import { MediaAsset } from "#media/domain/media-asset.ts";
import type { MediaStatusName } from "#media/domain/media-status.ts";
import { roomFor } from "#shared/domain/allowance.ts";
import type { Allowance } from "#shared/domain/allowance.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { anyUuid } from "#shared/infrastructure/any-uuid.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { mediaAssets } from "./schema.ts";

type Row = typeof mediaAssets.$inferSelect;

type NewRow = typeof mediaAssets.$inferInsert;

const decodeAsset = Schema.decodeUnknownEffect(MediaAsset);

// Every column but the description, which changes on its own.
const stateColumns = (asset: MediaAsset): Omit<NewRow, "altText"> => {
  const { metadata, status } = asset;
  const dimensions = Option.getOrNull(metadata.dimensions);

  const multipart =
    status._tag === "pending" && status.upload._tag === "multipart"
      ? status.upload
      : null;

  return {
    aiGenerated: asset.aiGenerated,
    byteSize: asset.byteSize,
    codec: Option.getOrNull(metadata.codec),
    contentType: asset.contentType,
    createdAt: DateTime.toDate(asset.createdAt),
    durationMs: metadata.duration.pipe(
      Option.map((duration) => Math.round(Duration.toMillis(duration))),
      Option.getOrNull
    ),
    height: dimensions?.height ?? null,
    id: asset.id,
    multipartPartSize: multipart?.partSize ?? null,
    multipartUploadId: multipart?.uploadId ?? null,
    pageCount: Option.getOrNull(metadata.pages),
    probeState: status._tag === "uploaded" ? status.probe : null,
    rejectionReason: status._tag === "rejected" ? status.reason : null,
    status: status._tag,
    storageKey: asset.storageKey,
    updatedAt: DateTime.toDate(asset.updatedAt),
    width: dimensions?.width ?? null,
    workspaceId: asset.workspaceId,
  };
};

const toRow = (asset: MediaAsset): NewRow => ({
  ...stateColumns(asset),
  altText: Option.getOrNull(asset.altText),
});

// The status in MediaStatus's encoded form, checked when the asset decodes.
const statusOf = (row: Row) => {
  if (row.status === "pending") {
    return {
      _tag: "pending",
      upload:
        row.multipartUploadId === null
          ? { _tag: "single" }
          : {
              _tag: "multipart",
              partSize: row.multipartPartSize,
              uploadId: row.multipartUploadId,
            },
    };
  }

  if (row.status === "rejected") {
    return { _tag: "rejected", reason: row.rejectionReason };
  }

  if (row.status === "uploaded") {
    return { _tag: "uploaded", probe: row.probeState ?? "pending" };
  }

  return { _tag: row.status };
};

const dimensionsOf = (row: Row) =>
  row.width === null || row.height === null
    ? Option.none()
    : Option.some({ height: row.height, width: row.width });

// A row that does not decode was written by something other than this
// repository: a bug, not a failure callers can handle.
const fromRow = (row: Row): Effect.Effect<MediaAsset> =>
  decodeAsset({
    aiGenerated: row.aiGenerated,
    altText: Option.fromNullOr(row.altText),
    byteSize: row.byteSize,
    contentType: row.contentType,
    createdAt: DateTime.fromDateUnsafe(row.createdAt),
    id: row.id,
    metadata: {
      codec: Option.fromNullOr(row.codec),
      dimensions: dimensionsOf(row),
      duration: Option.fromNullOr(row.durationMs).pipe(
        Option.map(Duration.millis)
      ),
      pages: Option.fromNullOr(row.pageCount),
    },
    status: statusOf(row),
    storageKey: row.storageKey,
    updatedAt: DateTime.fromDateUnsafe(row.updatedAt),
    workspaceId: row.workspaceId,
  }).pipe(Effect.orDie);

const byId = (workspaceId: WorkspaceId, assetId: MediaAssetId) =>
  and(eq(mediaAssets.workspaceId, workspaceId), eq(mediaAssets.id, assetId));

// The files that take room: uploaded and ready ones, and uploads started
// after `pendingSince`, which may still arrive.
const takingRoom = (pendingSince: DateTime.Utc) =>
  or(
    inArray(mediaAssets.status, ["uploaded", "ready"]),
    and(
      eq(mediaAssets.status, "pending"),
      gt(mediaAssets.createdAt, DateTime.toDate(pendingSince))
    )
  );

/**
 * Media assets in Postgres, through Drizzle. A database failure is a defect
 * here: no caller can do better than report it.
 */
export const DrizzleMediaAssetsLive = Layer.effect(
  MediaAssets,
  Effect.gen(function* DrizzleMediaAssetsLive() {
    const db = yield* Drizzle;
    const client = yield* SqlClient.SqlClient;

    const storedBytes = Effect.fn("MediaAssets.storedBytes")(
      function* storedBytes(
        workspaceId: WorkspaceId,
        pendingSince: DateTime.Utc
      ) {
        const [row] = yield* db
          .select({
            bytes: sql<string>`coalesce(sum(${mediaAssets.byteSize}), 0)::text`,
          })
          .from(mediaAssets)
          .where(
            and(
              eq(mediaAssets.workspaceId, workspaceId),
              takingRoom(pendingSince)
            )
          )
          .pipe(Effect.orDie);

        return Number(row?.bytes ?? "0");
      }
    );

    const storedBytesIn = Effect.fn("MediaAssets.storedBytesIn")(
      function* storedBytesIn(
        workspaceIds: readonly WorkspaceId[],
        pendingSince: DateTime.Utc
      ) {
        if (workspaceIds.length === 0) {
          return new Map<WorkspaceId, number>();
        }

        const rows = yield* db
          .select({
            bytes: sql<string>`sum(${mediaAssets.byteSize})::text`,
            workspaceId: mediaAssets.workspaceId,
          })
          .from(mediaAssets)
          .where(
            and(
              anyUuid(mediaAssets.workspaceId, workspaceIds),
              takingRoom(pendingSince)
            )
          )
          .groupBy(mediaAssets.workspaceId)
          .pipe(Effect.orDie);

        const stored = new Map(
          rows.map((row) => [row.workspaceId, Number(row.bytes)])
        );

        // Keyed by the ids asked for, which are the workspaces' own.
        return new Map(
          workspaceIds.flatMap((id) => {
            const bytes = stored.get(id);

            return bytes === undefined ? [] : [[id, bytes] as const];
          })
        );
      }
    );

    const storedAcross = Effect.fn("MediaAssets.storedAcross")(
      function* storedAcross(
        workspaceIds: readonly WorkspaceId[],
        pendingSince: DateTime.Utc
      ) {
        if (workspaceIds.length === 0) {
          return 0;
        }

        const [row] = yield* db
          .select({
            bytes: sql<string>`coalesce(sum(${mediaAssets.byteSize}), 0)::text`,
          })
          .from(mediaAssets)
          .where(
            and(
              anyUuid(mediaAssets.workspaceId, workspaceIds),
              takingRoom(pendingSince)
            )
          )
          .pipe(Effect.orDie);

        return Number(row?.bytes ?? "0");
      }
    );

    // What the workspace and the others of its pool store, in one count,
    // the pool held from here to the end of the transaction, after the
    // workspace's lock. Without a limit, no pool is read nor held.
    const pooledBytes = (
      workspaceId: WorkspaceId,
      allowance: Allowance,
      pendingSince: DateTime.Utc,
      sharedWith: Effect.Effect<readonly WorkspaceId[]>
    ) =>
      Effect.gen(function* pooled() {
        yield* client`SELECT pg_advisory_xact_lock(hashtext('peal-server/media/storage'), hashtext(${workspaceId}))`;

        if (Option.isNone(allowance)) {
          return 0;
        }

        const others = yield* sharedWith;

        return yield* storedAcross([workspaceId, ...others], pendingSince);
      });

    const insertWithin = (
      asset: MediaAsset,
      allowance: Allowance,
      pendingSince: DateTime.Utc,
      sharedWith: Effect.Effect<readonly WorkspaceId[]>
    ) =>
      client
        .withTransaction(
          Effect.gen(function* insertHeld() {
            const used = yield* pooledBytes(
              asset.workspaceId,
              allowance,
              pendingSince,
              sharedWith
            );

            yield* Effect.fromResult(
              roomFor("mediaStorage", allowance, used, asset.byteSize)
            );

            yield* db.insert(mediaAssets).values(toRow(asset));
          })
        )
        .pipe(
          Effect.catchTag("SqlError", Effect.die),
          Effect.catchIf(
            (failure) => failure._tag !== "PlanLimitReached",
            Effect.die
          ),
          Effect.withSpan("MediaAssets.insertWithin")
        );

    const findById = Effect.fn("MediaAssets.findById")(function* findById(
      workspaceId: WorkspaceId,
      assetId: MediaAssetId
    ) {
      const rows = yield* db
        .select()
        .from(mediaAssets)
        .where(byId(workspaceId, assetId))
        .pipe(Effect.orDie);

      const [row] = rows;

      return row === undefined
        ? Option.none()
        : Option.some(yield* fromRow(row));
    });

    const update = Effect.fn("MediaAssets.update")(function* update(
      asset: MediaAsset,
      from: MediaStatusName
    ) {
      // A row still in `from` has not changed status since the caller read
      // it: statuses only move forward, and an uploaded asset that cannot
      // be probed stays uploaded with the reason, which the last write
      // gives. The description is left as it is: it changes on its own.
      const [updated] = yield* db
        .update(mediaAssets)
        .set(stateColumns(asset))
        .where(
          and(byId(asset.workspaceId, asset.id), eq(mediaAssets.status, from))
        )
        .returning()
        .pipe(Effect.orDie);

      if (updated !== undefined) {
        return yield* fromRow(updated);
      }

      const current = yield* findById(asset.workspaceId, asset.id);

      return Option.isSome(current)
        ? current.value
        : yield* new MediaAssetNotFound({ assetId: asset.id });
    });

    const updateWithin = (
      asset: MediaAsset,
      allowance: Allowance,
      pendingSince: DateTime.Utc,
      sharedWith: Effect.Effect<readonly WorkspaceId[]>
    ) =>
      client
        .withTransaction(
          Effect.gen(function* updateHeld() {
            const used = yield* pooledBytes(
              asset.workspaceId,
              allowance,
              pendingSince,
              sharedWith
            );

            yield* Effect.fromResult(
              roomFor("mediaStorage", allowance, used, asset.byteSize)
            );

            return yield* update(asset, "pending");
          })
        )
        .pipe(
          Effect.catchTag("SqlError", Effect.die),
          Effect.withSpan("MediaAssets.updateWithin")
        );

    return MediaAssets.of({
      describe: Effect.fn("MediaAssets.describe")(function* describe(
        workspaceId: WorkspaceId,
        assetId: MediaAssetId,
        altText: Option.Option<AltText>,
        now: DateTime.Utc
      ) {
        const [row] = yield* db
          .update(mediaAssets)
          .set({
            altText: Option.getOrNull(altText),
            updatedAt: DateTime.toDate(now),
          })
          .where(byId(workspaceId, assetId))
          .returning()
          .pipe(Effect.orDie);

        return row === undefined
          ? yield* new MediaAssetNotFound({ assetId })
          : yield* fromRow(row);
      }),
      findById,
      insert: Effect.fn("MediaAssets.insert")(function* insert(
        asset: MediaAsset
      ) {
        yield* db.insert(mediaAssets).values(toRow(asset)).pipe(Effect.orDie);
      }),
      insertWithin,
      list: Effect.fn("MediaAssets.list")(function* list(
        workspaceId: WorkspaceId,
        { after, limit }: MediaPageRequest
      ) {
        // One row past the page tells whether another page follows.
        const rows = yield* db
          .select()
          .from(mediaAssets)
          .where(
            Option.match(after, {
              onNone: () => eq(mediaAssets.workspaceId, workspaceId),
              onSome: (id) =>
                and(
                  eq(mediaAssets.workspaceId, workspaceId),
                  lt(mediaAssets.id, id)
                ),
            })
          )
          .orderBy(desc(mediaAssets.id))
          .limit(limit + 1)
          .pipe(Effect.orDie);

        const assets = yield* Effect.forEach(rows.slice(0, limit), (row) =>
          fromRow(row)
        );

        const last = assets.at(-1);

        const page: MediaPage = {
          assets,
          next:
            rows.length > limit && last !== undefined
              ? Option.some(last.id)
              : Option.none(),
        };

        return page;
      }),
      remove: Effect.fn("MediaAssets.remove")(function* remove(
        workspaceId: WorkspaceId,
        assetId: MediaAssetId
      ) {
        yield* db
          .delete(mediaAssets)
          .where(byId(workspaceId, assetId))
          .pipe(Effect.orDie);
      }),
      storedBytes,
      storedAcross,
      storedBytesIn,
      update,
      updateWithin,
    });
  })
);
