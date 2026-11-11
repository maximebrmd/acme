import type {
  ChannelSetNotFound,
  Forbidden,
  InvalidTimeZone,
  PlanLimitReached,
  PostContentInvalid,
  PostNotFound,
  PostStatusConflict,
  QueueHasNoRoom,
  QueueNotFound,
  ScheduleInPast,
  SignatureNotFound,
  TooManyRequests,
  Unauthenticated,
  UnknownChannels,
  UnknownMedia,
  UnknownTags,
  WorkspaceNotFound,
} from "peal-contract";

/** Why a request of the composer failed, as the API declares it. */
export type ComposerFailure =
  | ChannelSetNotFound
  | Forbidden
  | InvalidTimeZone
  | PlanLimitReached
  | PostContentInvalid
  | PostNotFound
  | PostStatusConflict
  | QueueHasNoRoom
  | QueueNotFound
  | ScheduleInPast
  | SignatureNotFound
  // Answered to keys and applications only: the web app signs in with a
  // session, whose requests are not counted.
  | TooManyRequests
  | Unauthenticated
  | UnknownChannels
  | UnknownMedia
  | UnknownTags
  | WorkspaceNotFound
  // The date and time picked name no instant.
  | { readonly _tag: "InvalidTime" }
  // The request failed in a way the API does not declare: the network, or
  // an answer that could not be read.
  | { readonly _tag: "Unexpected" };
