import { Effect, Option } from "effect";
import { Atom, Reactivity } from "effect/reactivity";
import type { Media } from "peal-contract";

import { PealApi } from "#api/client.ts";
import {
  everything,
  pageKeyOf,
  pageOfKey,
  queryOf,
} from "#media/library-search.ts";
import type { LibrarySearch } from "#media/library-search.ts";
import { browserTransfer, Transfer } from "#media/transfer.ts";
import { uploadApiOf } from "#media/upload-api.ts";
import { uploadFile } from "#media/upload-file.ts";

/** What lists a workspace's media, which uploads and deletions refresh. */
export const mediaKey = (workspaceId: string): string => `media:${workspaceId}`;

const pages = Atom.family((key: string) => {
  const { cursor, search, workspaceId } = pageOfKey(key);

  return PealApi.query("media", "list", {
    params: { workspaceId },
    query: queryOf(search, cursor),
    reactivityKeys: [mediaKey(workspaceId)],
  });
});

/**
 * A page of a workspace's media, newest first: the first, or the one at
 * `cursor`, of the whole library or of what a search narrows it to.
 */
export const mediaPage = (
  workspaceId: string,
  cursor: Option.Option<string>,
  search: LibrarySearch = everything
) => pages(pageKeyOf(workspaceId, search, cursor));

/** Deletes media, then lists the workspace's media again. */
export const deleteMedia = PealApi.mutation("media", "delete");

/** Which posts show the media: what deleting it would do to them. */
export const mediaUsage = Atom.family((key: string) => {
  const [workspaceId = "", mediaId = ""] = key.split("/");

  return PealApi.query("media", "usage", {
    params: { mediaId, workspaceId },
    reactivityKeys: [mediaKey(workspaceId)],
  });
});

/** The usage query of one media of the workspace. */
export const usageOf = (workspaceId: string, mediaId: string) =>
  mediaUsage(`${workspaceId}/${mediaId}`);

/** Where an upload stands while it runs. */
export interface UploadProgress {
  readonly phase: "preparing" | "sending" | "completing";
  /** How much of the file has gone, from 0 to 1. */
  readonly sent: number;
  /** The media, once the API recorded it. */
  readonly media: Option.Option<Media>;
}

const starting: UploadProgress = {
  media: Option.none(),
  phase: "preparing",
  sent: 0,
};

/** The progress of the upload with this id (one per file the uploader takes). */
export const uploadProgress = Atom.family((_id: string) =>
  Atom.make<UploadProgress>(starting)
);

/** A file to upload into a workspace. */
export interface UploadRequest {
  readonly altText: string;
  readonly file: File;
  readonly workspaceId: string;
}

/**
 * The upload with this id: writing a request starts it (again), writing
 * `Atom.Interrupt` cancels it. Its result is the uploaded media. The
 * workspace's media lists refresh when it ends.
 */
export const upload = Atom.family((id: string) =>
  PealApi.runtime.fn<UploadRequest>()((request, get) =>
    Effect.gen(function* runUpload() {
      const client = yield* PealApi;
      const progress = uploadProgress(id);

      get.set(progress, starting);

      const update = (change: Partial<UploadProgress>) => {
        get.set(progress, { ...get(progress), ...change });
      };

      return yield* uploadFile(
        uploadApiOf(client, request.workspaceId),
        request.file,
        {
          altText: request.altText,
          events: {
            onCompleting: () => {
              update({ phase: "completing", sent: 1 });
            },
            onPrepared: (media) => {
              update({ media: Option.some(media), phase: "sending" });
            },
            onProgress: (sent) => {
              update({ sent });
            },
          },
        }
      ).pipe(
        Effect.provideService(Transfer, browserTransfer),
        Reactivity.mutation([mediaKey(request.workspaceId)])
      );
    })
  )
);

/** A description to save. */
export interface DescribeRequest {
  readonly altText: string;
  readonly mediaId: string;
  readonly workspaceId: string;
}

/**
 * Saves the description of the media an upload made, one atom per upload
 * so that describing one file never cancels saving another.
 */
export const describeUpload = Atom.family((_id: string) =>
  PealApi.runtime.fn<DescribeRequest>()(({ altText, mediaId, workspaceId }) =>
    Effect.gen(function* describe() {
      const client = yield* PealApi;
      const trimmed = altText.trim();

      return yield* client.media
        .describe({
          params: { mediaId, workspaceId },
          payload: { altText: trimmed === "" ? null : trimmed },
        })
        .pipe(Reactivity.mutation([mediaKey(workspaceId)]));
    })
  )
);
