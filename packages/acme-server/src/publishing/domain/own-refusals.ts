/**
 * The codes of the refusals Acme makes itself, before any platform is
 * called: the post's channel or one of its media can no longer be used.
 * They are stored in the publication journal, so never change one. The
 * publication policy tells them apart from the platforms' own codes.
 */
export const ownRefusalCodes = {
  // A BadRequest: the channel is turned off.
  channelDisabled: "channelDisabled",
  // A BadRequest: the channel is no longer connected to the workspace.
  channelDisconnected: "channelDisconnected",
  // A MediaRejected: the media was deleted, or is no longer ready.
  mediaRemoved: "mediaUnavailable",
} as const;
