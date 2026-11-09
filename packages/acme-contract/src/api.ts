import { HttpApi, OpenApi } from "effect/http-api";

import { ApiKeysApi } from "./api-keys.ts";
import { ChannelOAuthApi } from "./channel-oauth.ts";
import { ChannelsApi } from "./channels.ts";
import { SessionApi } from "./session.ts";
import { SystemApi } from "./system.ts";

export { DatabaseUnavailable } from "./database-unavailable.ts";

export { ApiKeyNotFound } from "./api-key-not-found.ts";

export {
  ApiKeySchema,
  CreatedApiKeySchema,
  NewApiKeySchema,
} from "./api-keys.ts";

export type { ApiKey, NewApiKey } from "./api-keys.ts";

export { Authentication } from "./authentication.ts";

export { ChannelNotFound } from "./channel-not-found.ts";

export {
  BlueskyClientMetadataSchema,
  JwksSchema,
  PublicJwkSchema,
} from "./channel-oauth.ts";

export type {
  BlueskyClientMetadata,
  Jwks,
  PublicJwk,
} from "./channel-oauth.ts";

export {
  AuthorizationSchema,
  ChannelSchema,
  ChannelStatusSchema,
  ConnectCallbackSchema,
  ConnectChannelSchema,
} from "./channels.ts";

export type {
  Authorization,
  Channel,
  ChannelStatus,
  ConnectCallback,
  ConnectChannel,
} from "./channels.ts";

export { ConnectFailed, ConnectFailureReasonSchema } from "./connect-failed.ts";

export type { ConnectFailureReason } from "./connect-failed.ts";

export { CurrentMember } from "./current-member.ts";

export { CurrentPrincipal } from "./current-principal.ts";

export { Forbidden } from "./forbidden.ts";

export { PermissionSchema } from "./permission.ts";

export type { Permission } from "./permission.ts";

export { PlatformSchema } from "./platform.ts";

export type { Platform } from "./platform.ts";

export { MemberSchema, PrincipalSchema } from "./principal.ts";

export { OAuthClientNotPublished } from "./oauth-client-not-published.ts";

export { PlatformUnreachable } from "./platform-unreachable.ts";

export type { Member, Principal } from "./principal.ts";

export { MeSchema, MembershipSchema } from "./session.ts";

export type { Me, Membership } from "./session.ts";

export { Unauthenticated } from "./unauthenticated.ts";

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
  .add(ChannelOAuthApi)
  .annotateMerge(OpenApi.annotations({ title: "Acme API" })) {}
