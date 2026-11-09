"use client";

import { useAtomValue } from "@effect/atom-react";
import type { MediaAttachment } from "peal-contract";
import { Option } from "effect";
import { AsyncResult, Atom } from "effect/reactivity";

import { PealApi } from "#api/client.ts";
import { mediaKey } from "#media/atoms.ts";
import type { AttachedMedia } from "#posts/media-fit.ts";

/**
 * One of the workspace's media, as the API shows it, read again when the
 * workspace's media change.
 */
export const mediaItem = (workspaceId: string, mediaId: string) =>
  PealApi.query("media", "get", {
    params: { mediaId, workspaceId },
    reactivityKeys: [mediaKey(workspaceId)],
  });

// Media ids are UUIDs: neither a slash nor a comma appears in one.
const lists = Atom.family((key: string) => {
  const [workspaceId = "", ids = ""] = key.split("/");
  const mediaIds = ids === "" ? [] : ids.split(",");

  return Atom.make((get) =>
    mediaIds.map((mediaId) =>
      AsyncResult.value(get(mediaItem(workspaceId, mediaId)))
    )
  );
});

/**
 * The post's attachments, each with its media once loaded. A reordered list
 * reads the same media again from the atoms each row already holds.
 */
export const useAttachedMedia = (
  workspaceId: string,
  attachments: readonly MediaAttachment[]
): readonly AttachedMedia[] => {
  const media = useAtomValue(
    lists(
      `${workspaceId}/${attachments.map(({ mediaId }) => mediaId).join(",")}`
    )
  );

  return attachments.map(({ altText, mediaId }, index) => ({
    altText,
    media: Option.flatten(Option.fromUndefinedOr(media[index])),
    mediaId,
  }));
};
