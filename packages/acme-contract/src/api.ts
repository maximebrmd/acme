import { HttpApi, OpenApi } from "effect/http-api";

import { ApiKeysApi } from "./api-keys.ts";
import { ChannelsApi } from "./channels.ts";
import { MediaApi } from "./media.ts";
import { SessionApi } from "./session.ts";
import { SystemApi } from "./system.ts";

export { DatabaseUnavailable } from "./database-unavailable.ts";

export { AltTextTooLong } from "./alt-text-too-long.ts";

export { ApiKeyNotFound } from "./api-key-not-found.ts";

export {
  ApiKeySchema,
  CreatedApiKeySchema,
  NewApiKeySchema,
} from "./api-keys.ts";

export type { ApiKey, NewApiKey } from "./api-keys.ts";

export { Authentication } from "./authentication.ts";

export { ChannelNotFound } from "./channel-not-found.ts";

export { ChannelSchema, ChannelStatusSchema } from "./channels.ts";

export type { Channel, ChannelStatus } from "./channels.ts";

export { CurrentMember } from "./current-member.ts";

export { CurrentPrincipal } from "./current-principal.ts";

export { Forbidden } from "./forbidden.ts";

export {
  defaultMediaPageSize,
  maxMediaPageSize,
  MediaContentTypeSchema,
  MediaDescriptionSchema,
  MediaKindSchema,
  MediaPageSchema,
  MediaSchema,
  NewUploadSchema,
  PreparedUploadSchema,
  SignedRequestSchema,
  UploadPartSchema,
  UploadTargetSchema,
} from "./media.ts";

export type {
  Media,
  MediaContentType,
  MediaDescription,
  MediaKind,
  MediaPage,
  NewUpload,
  PreparedUpload,
  SignedRequest,
  UploadPart,
  UploadTarget,
} from "./media.ts";

export { MediaNotFound } from "./media-not-found.ts";

export {
  MediaStatusSchema,
  ProbeStateSchema,
  RejectionReasonSchema,
} from "./media-status.ts";

export type {
  MediaStatus,
  ProbeState,
  RejectionReason,
} from "./media-status.ts";

export { MediaStoreUnavailable } from "./media-store-unavailable.ts";

export { MediaTooLarge } from "./media-too-large.ts";

export { PermissionSchema } from "./permission.ts";

export type { Permission } from "./permission.ts";

export { PlatformSchema } from "./platform.ts";

export type { Platform } from "./platform.ts";

export { MemberSchema, PrincipalSchema } from "./principal.ts";

export type { Member, Principal } from "./principal.ts";

export { MeSchema, MembershipSchema } from "./session.ts";

export type { Me, Membership } from "./session.ts";

export { Unauthenticated } from "./unauthenticated.ts";

export { UnsupportedMediaType } from "./unsupported-media-type.ts";

export { UploadIncomplete } from "./upload-incomplete.ts";

export { UploadRejected } from "./upload-rejected.ts";

export { WorkspaceAccess } from "./workspace-access.ts";

export { WorkspaceNotFound } from "./workspace-not-found.ts";

// The one definition of the HTTP API. The server implements it; the web app,
// the CLI and the MCP server derive their typed clients from it, and the docs
// render its OpenAPI document.
export class Api extends HttpApi.make("acme")
  .add(SystemApi)
  .add(SessionApi)
  .add(ApiKeysApi)
  .add(ChannelsApi)
  .add(MediaApi)
  .annotateMerge(OpenApi.annotations({ title: "Acme API" })) {}
