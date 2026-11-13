import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option, Result } from "effect";

import { altTextOf, maxAltTextLength } from "#media/domain/alt-text.ts";
import { fileNameOf } from "#media/domain/file-name.ts";
import { MediaAssetIdSchema } from "#media/domain/media-asset-id.ts";
import {
  acceptUpload,
  describe as describeAsset,
  markReady,
  markRejected,
  markUnprobed,
  markUploaded,
  mismatchOf,
  startUpload,
} from "#media/domain/media-asset.ts";
import type { AcceptedUpload, MediaAsset } from "#media/domain/media-asset.ts";
import {
  maxByteSize,
  normalizeContentType,
} from "#media/domain/media-format.ts";
import { MediaMetadata } from "#media/domain/media-metadata.ts";
import { MultipartUploadIdSchema } from "#media/domain/media-status.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";

const id = MediaAssetIdSchema.make("00000000-0000-7000-8000-000000000001");

const workspaceId = WorkspaceIdSchema.make(
  "00000000-0000-7000-8000-000000000002"
);

const utc = (iso: string): DateTime.Utc => DateTime.makeUnsafe(iso);

const createdAt = utc("2026-06-15T07:00:00Z");

const now = utc("2026-06-15T07:05:00Z");

const png: AcceptedUpload = {
  byteSize: 2048,
  contentType: "image/png",
  kind: "image",
};

const pending = startUpload(
  {
    accepted: png,
    altText: Option.none(),
    id,
    upload: { _tag: "single" },
    workspaceId,
  },
  createdAt
);

const uploaded = Result.getOrThrow(markUploaded(pending, now));

const statuses = {
  pending,
  ready: Result.getOrThrow(markReady(uploaded, MediaMetadata.unknown, now)),
  rejected: Result.getOrThrow(markRejected(pending, "sizeMismatch", now)),
  uploaded,
};

const statusOf = <E>(result: Result.Result<MediaAsset, E>) =>
  Option.getOrUndefined(Result.getSuccess(result))?.status;

const failureTag = <A, E extends { readonly _tag: string }>(
  result: Result.Result<A, E>
): string | undefined => Option.getOrUndefined(Result.getFailure(result))?._tag;

const mebibyte = 1024 * 1024;

describe(acceptUpload, () => {
  it.each([
    ["image/jpeg", "image"],
    ["image/png", "image"],
    ["image/gif", "image"],
    ["image/webp", "image"],
    ["video/mp4", "video"],
    ["video/quicktime", "video"],
    ["application/pdf", "document"],
  ])("accepts %s as an %s", (contentType, kind) => {
    const accepted = Result.getOrThrow(acceptUpload(contentType, 1024));

    expect(accepted).toStrictEqual({ byteSize: 1024, contentType, kind });
  });

  it.each([
    "image/svg+xml",
    "image/heic",
    "image/avif",
    "video/webm",
    "application/msword",
    "text/html",
    "",
  ])("refuses %j", (contentType) => {
    const result = acceptUpload(contentType, 1024);

    expect(Result.getFailure(result)).toStrictEqual(
      Option.some(
        expect.objectContaining({ _tag: "UnsupportedMediaType", contentType })
      )
    );
  });

  it("reads content types without case or parameters", () => {
    const accepted = acceptUpload("Image/JPEG; charset=binary", 1024);

    expect(
      Option.getOrUndefined(Result.getSuccess(accepted))?.contentType
    ).toBe("image/jpeg");
  });

  it.each([
    ["image/png", 16 * mebibyte],
    ["video/mp4", 1024 * mebibyte],
    ["application/pdf", 100 * mebibyte],
  ])("takes a %s of exactly the limit, %i bytes", (contentType, limit) => {
    expect(Result.isSuccess(acceptUpload(contentType, limit))).toBeTruthy();
  });

  it.each([
    ["image/png", "image", 16 * mebibyte],
    ["video/quicktime", "video", 1024 * mebibyte],
    ["application/pdf", "document", 100 * mebibyte],
  ])("refuses a %s one byte over its limit", (contentType, kind, limit) => {
    const result = acceptUpload(contentType, limit + 1);

    expect(Result.getFailure(result)).toStrictEqual(
      Option.some(
        expect.objectContaining({
          _tag: "MediaTooLarge",
          byteSize: limit + 1,
          kind,
          maxByteSize: limit,
        })
      )
    );
  });

  it("keeps images far smaller than videos", () => {
    expect(maxByteSize.image).toBeLessThan(maxByteSize.video);
  });
});

describe(normalizeContentType, () => {
  it("drops parameters and case", () => {
    expect(normalizeContentType(" Video/MP4 ; codecs=avc1")).toBe("video/mp4");
  });
});

describe(startUpload, () => {
  it("records a pending asset under its workspace's folder", () => {
    expect(pending.status).toStrictEqual({
      _tag: "pending",
      upload: { _tag: "single" },
    });
    expect(pending.storageKey).toBe(`media/${workspaceId}/${id}.png`);
    expect(pending.kind).toBe("image");
    expect(pending.metadata).toStrictEqual(MediaMetadata.unknown);
    expect(pending.createdAt).toStrictEqual(createdAt);
  });

  it("keeps the store's id of a multipart upload", () => {
    const upload = {
      _tag: "multipart",
      partSize: 8 * mebibyte,
      uploadId: MultipartUploadIdSchema.make("upload-1"),
    } as const;

    const video = startUpload(
      {
        accepted: {
          byteSize: 40 * mebibyte,
          contentType: "video/quicktime",
          kind: "video",
        },
        altText: Option.none(),
        id,
        upload,
        workspaceId,
      },
      createdAt
    );

    expect(video.status).toStrictEqual({ _tag: "pending", upload });
    expect(video.storageKey).toBe(`media/${workspaceId}/${id}.mov`);
  });
});

describe(mismatchOf, () => {
  it("finds nothing wrong with the declared file", () => {
    expect(
      mismatchOf(pending, {
        byteSize: 2048,
        contentType: Option.some("image/png"),
      })
    ).toStrictEqual(Option.none());
  });

  it("compares content types without case or parameters", () => {
    expect(
      mismatchOf(pending, {
        byteSize: 2048,
        contentType: Option.some("IMAGE/PNG; q=1"),
      })
    ).toStrictEqual(Option.none());
  });

  it.each([2047, 2049])("refuses a file of %i bytes", (byteSize) => {
    expect(
      mismatchOf(pending, { byteSize, contentType: Option.some("image/png") })
    ).toStrictEqual(Option.some("sizeMismatch"));
  });

  it.each([Option.some("image/jpeg"), Option.none()])(
    "refuses a file stored as %o",
    (contentType) => {
      expect(
        mismatchOf(pending, { byteSize: 2048, contentType })
      ).toStrictEqual(Option.some("typeMismatch"));
    }
  );
});

describe(markUploaded, () => {
  it("marks a pending asset uploaded", () => {
    const result = markUploaded(pending, now);

    expect(statusOf(result)).toStrictEqual({
      _tag: "uploaded",
      probe: "pending",
    });
    expect(
      Option.getOrUndefined(Result.getSuccess(result))?.updatedAt
    ).toStrictEqual(now);
  });

  it.each(["uploaded", "ready", "rejected"] as const)(
    "refuses a %s asset",
    (status) => {
      expect(failureTag(markUploaded(statuses[status], now))).toBe(
        "InvalidMediaTransition"
      );
    }
  );
});

describe(markUnprobed, () => {
  it.each(["unavailable", "unreadable", "timedOut"] as const)(
    "keeps an uploaded asset uploaded, %s",
    (probe) => {
      const unprobed = markUnprobed(statuses.uploaded, probe, now);

      expect(statusOf(unprobed)).toStrictEqual({ _tag: "uploaded", probe });
    }
  );

  it.each(["pending", "ready", "rejected"] as const)(
    "refuses a %s asset",
    (status) => {
      expect(
        failureTag(markUnprobed(statuses[status], "unavailable", now))
      ).toBe("InvalidMediaTransition");
    }
  );
});

describe(markReady, () => {
  const metadata = new MediaMetadata({
    codec: Option.none(),
    dimensions: Option.some({ height: 600, width: 800 }),
    duration: Option.none(),
  });

  it("marks an asset ready once a probe reads it after failing", () => {
    const failed = Result.getOrThrow(
      markUnprobed(statuses.uploaded, "timedOut", now)
    );

    expect(statusOf(markReady(failed, metadata, now))).toStrictEqual({
      _tag: "ready",
    });
  });

  it("marks an uploaded asset ready with what the probe found", () => {
    const ready = Option.getOrUndefined(
      Result.getSuccess(markReady(statuses.uploaded, metadata, now))
    );

    expect(ready?.status).toStrictEqual({ _tag: "ready" });
    expect(ready?.metadata).toStrictEqual(metadata);
  });

  it.each(["pending", "ready", "rejected"] as const)(
    "refuses a %s asset",
    (status) => {
      expect(failureTag(markReady(statuses[status], metadata, now))).toBe(
        "InvalidMediaTransition"
      );
    }
  );
});

describe(markRejected, () => {
  it.each(["pending", "uploaded"] as const)(
    "rejects a %s asset with its reason",
    (status) => {
      expect(
        statusOf(markRejected(statuses[status], "typeMismatch", now))
      ).toStrictEqual({ _tag: "rejected", reason: "typeMismatch" });
    }
  );

  it.each(["ready", "rejected"] as const)("refuses a %s asset", (status) => {
    expect(
      failureTag(markRejected(statuses[status], "typeMismatch", now))
    ).toBe("InvalidMediaTransition");
  });
});

describe(describeAsset, () => {
  it.each(["pending", "uploaded", "ready", "rejected"] as const)(
    "describes a %s asset, keeping its status",
    (status) => {
      const altText = Result.getOrThrow(altTextOf("A white square"));
      const described = describeAsset(statuses[status], altText, now);

      expect(described.altText).toStrictEqual(altText);
      expect(described.status).toStrictEqual(statuses[status].status);
      expect(described.updatedAt).toStrictEqual(now);
    }
  );
});

describe(altTextOf, () => {
  it("trims a description", () => {
    expect(
      Result.getOrThrow(altTextOf("  A cat on a mat \n")).pipe(
        Option.getOrUndefined
      )
    ).toBe("A cat on a mat");
  });

  it.each(["", "   ", "\n\t"])("reads %j as no description", (text) => {
    expect(Result.getOrThrow(altTextOf(text))).toStrictEqual(Option.none());
  });

  it("keeps a description of the longest length", () => {
    const longest = "a".repeat(maxAltTextLength);

    expect(Option.getOrUndefined(Result.getOrThrow(altTextOf(longest)))).toBe(
      longest
    );
  });

  it("keeps a description composed, as a keyboard types it", () => {
    expect(
      Result.getOrThrow(altTextOf("Cafe\u0301 au lait")).pipe(Option.getOrNull)
    ).toBe("Caf\u00E9 au lait");
  });

  it("refuses a longer description", () => {
    expect(failureTag(altTextOf("a".repeat(maxAltTextLength + 1)))).toBe(
      "AltTextTooLong"
    );
  });
});

describe("the mark of a file made by AI", () => {
  it("is off unless the file was generated", () => {
    expect(pending.aiGenerated).toBeFalsy();
  });

  it("stays with the asset through every change", () => {
    const generated = startUpload(
      {
        accepted: png,
        aiGenerated: true,
        altText: Option.none(),
        id,
        upload: { _tag: "single" },
        workspaceId,
      },
      createdAt
    );

    const ready = Result.getOrThrow(
      markReady(
        Result.getOrThrow(markUploaded(generated, now)),
        MediaMetadata.unknown,
        now
      )
    );

    expect([
      generated.aiGenerated,
      ready.aiGenerated,
      describeAsset(ready, Option.none(), now).aiGenerated,
    ]).toStrictEqual([true, true, true]);
  });
});

describe("the file's name", () => {
  it("is none unless the file came with one", () => {
    expect(pending.fileName).toStrictEqual(Option.none());
  });

  it("stays with the asset through every change", () => {
    const fileName = fileNameOf("launch.png");

    const withName = startUpload(
      {
        accepted: png,
        altText: Option.none(),
        fileName,
        id,
        upload: { _tag: "single" },
        workspaceId,
      },
      createdAt
    );

    const uploadedWithName = Result.getOrThrow(markUploaded(withName, now));

    const ready = Result.getOrThrow(
      markReady(uploadedWithName, MediaMetadata.unknown, now)
    );

    expect([
      withName.fileName,
      uploadedWithName.fileName,
      ready.fileName,
      Result.getOrThrow(markUnprobed(uploadedWithName, "unavailable", now))
        .fileName,
      Result.getOrThrow(markRejected(withName, "sizeMismatch", now)).fileName,
      describeAsset(ready, Option.none(), now).fileName,
    ]).toStrictEqual(Array.from({ length: 6 }, () => fileName));
  });
});
