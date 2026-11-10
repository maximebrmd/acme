import type { Channel } from "peal-contract";

/** What names a channel: the workspace's own name for it, and the platform's. */
type Named = Pick<Channel, "displayName" | "handle" | "label">;

/**
 * The words that name a channel wherever one line names it: the name the
 * workspace gave it with the platform's handle beside it, or the handle
 * alone. The handle is never left out: it is what the platform posts as.
 */
export const channelName = ({
  handle,
  label,
}: Pick<Named, "handle" | "label">): string =>
  label === null ? handle : `${label} (${handle})`;

/**
 * A channel's main name where its handle is written beside it anyway (the
 * channels page, the composer's picker): the workspace's name for it, else
 * the name the platform shows, else the handle.
 */
export const channelTitle = ({ displayName, handle, label }: Named): string =>
  label ?? displayName ?? handle;

/** The letter that stands for a channel without a picture. */
export const channelInitial = (channel: Named): string =>
  channelTitle(channel).replace(/^@/u, "").slice(0, 1).toUpperCase();
