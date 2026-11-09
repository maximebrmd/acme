import type {
  Forbidden,
  InvalidTimeZone,
  PlanLimitReached,
  PostContentInvalid,
  PostNotFound,
  PostStatusConflict,
  ScheduleInPast,
  Unauthenticated,
  UnknownChannels,
  UnknownMedia,
  WorkspaceNotFound,
} from "acme-contract";

/** Why a request of the composer failed, as the API declares it. */
export type ComposerFailure =
  | Forbidden
  | InvalidTimeZone
  | PlanLimitReached
  | PostContentInvalid
  | PostNotFound
  | PostStatusConflict
  | ScheduleInPast
  | Unauthenticated
  | UnknownChannels
  | UnknownMedia
  | WorkspaceNotFound
  // The date and time picked name no instant.
  | { readonly _tag: "InvalidTime" }
  // The request failed in a way the API does not declare: the network, or
  // an answer that could not be read.
  | { readonly _tag: "Unexpected" };
