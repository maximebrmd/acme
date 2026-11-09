import { HttpApi, OpenApi } from "effect/http-api";

import { ApiKeysApi } from "./api-keys.ts";
import { AssistantApi } from "./assistant.ts";
import { BillingApi } from "./billing.ts";
import { CaptchaApi } from "./captcha.ts";
import { ChannelOAuthApi } from "./channel-oauth.ts";
import { ChannelsApi } from "./channels.ts";
import { MediaApi } from "./media.ts";
import { NoticesApi } from "./notices.ts";
import { NotificationPreferencesApi } from "./notification-preferences.ts";
import { PostsApi } from "./posts.ts";
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

export {
  AssistantActionSchema,
  AssistantStatusSchema,
  AssistantToneSchema,
  SuggestionRequestSchema,
  SuggestionSchema,
  TranslationLanguageSchema,
} from "./assistant.ts";

export type {
  AssistantAction,
  AssistantStatus,
  AssistantTone,
  Suggestion,
  SuggestionRequest,
  TranslationLanguage,
} from "./assistant.ts";

export { AssistantFailed } from "./assistant-failed.ts";

export { AssistantInputRejected } from "./assistant-input-rejected.ts";

export { AssistantQuotaExceeded } from "./assistant-quota-exceeded.ts";

export { AssistantUnavailable } from "./assistant-unavailable.ts";

export { Authentication } from "./authentication.ts";

export {
  BillingApi,
  BillingSchema,
  BillingSubscriptionSchema,
  PeriodUsageSchema,
  PlanAllowancesSchema,
  PlanOfferSchema,
  SubscriptionStatusSchema,
  UsageSchema,
} from "./billing.ts";

export type {
  Billing,
  BillingSubscription,
  PeriodUsage,
  PlanAllowances,
  PlanOffer,
  SubscriptionStatus,
  Usage,
} from "./billing.ts";

export {
  PaidPlanSchema,
  PlanLimitSchema,
  PlanSchema,
} from "./billing-plans.ts";

export type { PaidPlan, Plan, PlanLimit } from "./billing-plans.ts";

export { CaptchaApi, CaptchaSchema } from "./captcha.ts";

export type { Captcha } from "./captcha.ts";

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

export { InvalidTimeRange } from "./invalid-time-range.ts";

export { InvalidTimeZone } from "./invalid-time-zone.ts";

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
  defaultNoticePageSize,
  MarkNoticesReadSchema,
  maxNoticePageSize,
  NoticeChannelSchema,
  NoticeEventSchema,
  NoticePageSchema,
  NoticeSchema,
  NoticesApi,
  UnreadNoticesSchema,
} from "./notices.ts";

export type {
  MarkNoticesRead,
  Notice,
  NoticeChannel,
  NoticeEvent,
  NoticePage,
  UnreadNotices,
} from "./notices.ts";

export {
  NotificationPreferencesApi,
  NotificationPreferencesChangeSchema,
  NotificationPreferencesSchema,
} from "./notification-preferences.ts";

export type {
  NotificationPreferences,
  NotificationPreferencesChange,
} from "./notification-preferences.ts";

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

export { PlanLimitReached } from "./plan-limit-reached.ts";

export { PlatformSchema } from "./platform.ts";

export type { Platform } from "./platform.ts";

export {
  ContentViolationSchema,
  PostContentInvalid,
} from "./post-content-invalid.ts";

export type { ContentViolation } from "./post-content-invalid.ts";

export { PostNotFound } from "./post-not-found.ts";

export { PostStatusConflict } from "./post-status-conflict.ts";

export { PostStatusSchema } from "./post-status.ts";

export type { PostStatus } from "./post-status.ts";

export {
  FailureReasonSchema,
  MediaAttachmentSchema,
  PostContentSchema,
  PostDraftSchema,
  PostOutcomeSchema,
  PostScheduleSchema,
  PostSchema,
  PostTargetSchema,
  PostTargetStatusSchema,
  SchedulePostSchema,
  TextOverrideSchema,
} from "./posts.ts";

export type {
  FailureReason,
  MediaAttachment,
  Post,
  PostContent,
  PostDraft,
  PostOutcome,
  PostSchedule,
  PostTarget,
  PostTargetStatus,
  SchedulePost,
  TextOverride,
} from "./posts.ts";

export {
  MemberSchema,
  OAuthGrantSchema,
  PrincipalSchema,
} from "./principal.ts";

export { OAuthClientNotPublished } from "./oauth-client-not-published.ts";

export { PlatformUnreachable } from "./platform-unreachable.ts";

export type { Member, OAuthGrant, Principal } from "./principal.ts";

export { cliClientId, OAuthApi } from "./oauth.ts";

export { PublicClientSchema } from "./oauth-clients.ts";

export type { PublicClient } from "./oauth-clients.ts";

export {
  AuthorizationServerSchema,
  ProtectedResourceSchema,
} from "./oauth-discovery.ts";

export type {
  AuthorizationServer,
  ProtectedResource,
} from "./oauth-discovery.ts";

export {
  DeviceAuthorizationRequestSchema,
  DeviceAuthorizationSchema,
  deviceCodeGrantType,
  OAuthClientErrorSchema,
  OAuthErrorSchema,
  RevocationRequestSchema,
  TokenRequestSchema,
  TokenSchema,
} from "./oauth-tokens.ts";

export type {
  DeviceAuthorization,
  OAuthError,
  Token,
  TokenRequest,
} from "./oauth-tokens.ts";

export { MeSchema, MembershipSchema } from "./session.ts";

export type { Me, Membership } from "./session.ts";

export { ScheduleInPast } from "./schedule-in-past.ts";

export { Unauthenticated } from "./unauthenticated.ts";

export { UnknownChannels } from "./unknown-channels.ts";

export { UnknownMedia } from "./unknown-media.ts";

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
  .add(ChannelOAuthApi)
  .add(PostsApi)
  .add(MediaApi)
  .add(NoticesApi)
  .add(NotificationPreferencesApi)
  .add(AssistantApi)
  .add(BillingApi)
  .add(CaptchaApi)
  .annotateMerge(OpenApi.annotations({ title: "Acme API" })) {}
