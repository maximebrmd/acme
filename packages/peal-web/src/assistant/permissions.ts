import type { Permission } from "peal-contract";

/**
 * Whether the member may have the assistant make images: it takes
 * assistant:use, and media:upload, as the image lands in the library.
 */
export const canGenerateImages = (permissions: readonly Permission[]) =>
  permissions.includes("assistant:use") && permissions.includes("media:upload");
