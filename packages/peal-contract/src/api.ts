import { HttpApi, OpenApi } from "effect/http-api";

import { AccountApi } from "./account.ts";
import { AnalyticsApi } from "./analytics.ts";
import { ApiKeysApi } from "./api-keys.ts";
import { AssistantApi } from "./assistant.ts";
import { BillingActionsApi } from "./billing-actions.ts";
import { BillingApi } from "./billing.ts";
import { CaptchaApi } from "./captcha.ts";
import { ChannelOAuthApi } from "./channel-oauth.ts";
import { ChannelsApi } from "./channels.ts";
import { ClientErrorsApi } from "./client-errors.ts";
import { ConnectedAppsApi } from "./connected-apps.ts";
import { DataDeletionApi } from "./data-deletion.ts";
import { InvitationsApi } from "./invitations.ts";
import { LegalApi } from "./legal.ts";
import { MediaApi } from "./media.ts";
import { MembersApi } from "./members.ts";
import { NoticesApi } from "./notices.ts";
import { NotificationPreferencesApi } from "./notification-preferences.ts";
import { PostsApi } from "./posts.ts";
import { SessionApi } from "./session.ts";
import { StaffApi } from "./staff.ts";
import { SystemApi } from "./system.ts";
import { TikTokApi } from "./tiktok.ts";
import { WebhooksApi } from "./webhooks.ts";
import { WorkspacesApi } from "./workspaces.ts";

export { DatabaseUnavailable } from "./database-unavailable.ts";

export {
  AccountApi,
  AccountExportSchema,
  DeleteAccountSchema,
} from "./account.ts";

export type { AccountExport, DeleteAccount } from "./account.ts";

export { ConnectedAppNotFound } from "./connected-app-not-found.ts";

export { ConnectedAppSchema, ConnectedAppsApi } from "./connected-apps.ts";

export type { ConnectedApp } from "./connected-apps.ts";

export { IncorrectPassword } from "./incorrect-password.ts";

export { LastOwner } from "./last-owner.ts";

export { TooManyPasswordAttempts } from "./too-many-password-attempts.ts";

export { DeleteWorkspaceSchema, WorkspacesApi } from "./workspaces.ts";

export { AlreadyMember } from "./already-member.ts";

export {
  InvitationSchema,
  InvitationsApi,
  NewInvitationSchema,
} from "./invitations.ts";

export type { Invitation, NewInvitation } from "./invitations.ts";

export { InvitationNotFound } from "./invitation-not-found.ts";

export { MembersApi, WorkspaceMemberSchema } from "./members.ts";

export type { WorkspaceMember } from "./members.ts";

export { RoleSchema } from "./role.ts";

export type { Role } from "./role.ts";

export { TooManyInvitations } from "./too-many-invitations.ts";

export type { DeleteWorkspace } from "./workspaces.ts";

export { WorkspaceBusy } from "./workspace-busy.ts";

export {
  SubscriptionToCancelSchema,
  WorkspaceSubscribed,
} from "./workspace-subscribed.ts";

export type { SubscriptionToCancel } from "./workspace-subscribed.ts";

export { BillingUnavailable } from "./billing-unavailable.ts";

export { BillingNotEnabled } from "./billing-not-enabled.ts";

export { NothingToCancel } from "./nothing-to-cancel.ts";

export { TrialUnavailable } from "./trial-unavailable.ts";

export { WithdrawalUnavailable } from "./withdrawal-unavailable.ts";

export { WorkspaceNameMismatch } from "./workspace-name-mismatch.ts";

export { AltTextTooLong } from "./alt-text-too-long.ts";

export {
  AnalyticsApi,
  AnalyticsSummarySchema,
  CalendarDaySchema,
  ChannelMetricsSchema,
  countedPlatforms,
  EngagementDaySchema,
  MetricsSnapshotSchema,
  MetricTotalsSchema,
  PostAnalyticsSchema,
  PostMetricsSchema,
  TargetMetricsSchema,
  TopPostSchema,
} from "./analytics.ts";

export type {
  AnalyticsSummary,
  CalendarDay,
  ChannelMetrics,
  EngagementDay,
  MetricsSnapshot,
  MetricTotals,
  PostAnalytics,
  PostMetrics,
  TargetMetrics,
  TopPost,
} from "./analytics.ts";

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

export { BillingActionsApi } from "./billing-actions.ts";

export {
  BillingApi,
  BillingSchema,
  BillingSubscriptionSchema,
  CancellationSchema,
  OrderPayloadSchema,
  OrderSchema,
  PeriodUsageSchema,
  PlanAllowancesSchema,
  PlanOfferSchema,
  PlanPriceSchema,
  SubscriptionStatusSchema,
  TrialOfferSchema,
  UsageSchema,
  WithdrawalPreviewSchema,
  WithdrawalSchema,
} from "./billing.ts";

export type {
  Billing,
  BillingSubscription,
  Cancellation,
  Order,
  OrderPayload,
  PeriodUsage,
  PlanAllowances,
  PlanOffer,
  PlanPrice,
  SubscriptionStatus,
  TrialOffer,
  Usage,
  Withdrawal,
  WithdrawalPreview,
} from "./billing.ts";

export {
  billingCurrency,
  BillingIntervalSchema,
  displayVatRate,
  MoneySchema,
  PaidPlanSchema,
  planCatalogue,
  PlanLimitSchema,
  PlanSchema,
  trialOffer,
  withDisplayVat,
} from "./billing-plans.ts";

export type {
  BillingInterval,
  Money,
  PaidPlan,
  Plan,
  PlanLimit,
  PlanLimits,
  PlanPrices,
} from "./billing-plans.ts";

export { CaptchaApi, CaptchaSchema } from "./captcha.ts";

export type { Captcha } from "./captcha.ts";

export { ChannelCannotPost } from "./channel-cannot-post.ts";

export { ChannelNotFound } from "./channel-not-found.ts";

export {
  TikTokAccountSchema,
  TikTokApi,
  TikTokBlockSchema,
  TikTokCreatorSchema,
} from "./tiktok.ts";

export type { TikTokAccount, TikTokBlock, TikTokCreator } from "./tiktok.ts";

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
  ChoosableAccountSchema,
  ChooseAccountsSchema,
  ConnectablePlatformsSchema,
  ConnectCallbackSchema,
  ConnectChannelSchema,
  ConnectOutcomeSchema,
} from "./channels.ts";

export type {
  Authorization,
  Channel,
  ChannelStatus,
  ChoosableAccount,
  ChooseAccounts,
  ConnectablePlatforms,
  ConnectCallback,
  ConnectChannel,
  ConnectOutcome,
} from "./channels.ts";

export {
  DataDeletionApi,
  DataDeletionConfirmationSchema,
  DataDeletionStatusSchema,
  MetaAppSchema,
  SignedRequestFormSchema,
} from "./data-deletion.ts";

export type {
  DataDeletionConfirmation,
  DataDeletionStatus,
  MetaApp,
  SignedRequestForm,
} from "./data-deletion.ts";

export { DataDeletionNotFound } from "./data-deletion-not-found.ts";

export { MetaAppNotConfigured } from "./meta-app-not-configured.ts";

export { SignedRequestRefused } from "./signed-request-refused.ts";

export { ConnectFailed, ConnectFailureReasonSchema } from "./connect-failed.ts";

export type { ConnectFailureReason } from "./connect-failed.ts";

export { ClientErrorIntake } from "./client-error-intake.ts";

export { ClientErrorTooLarge } from "./client-error-too-large.ts";

export {
  clientErrorLimits,
  ClientErrorKindSchema,
  ClientErrorReportSchema,
  ClientErrorsApi,
  maxClientErrorBytes,
} from "./client-errors.ts";

export type { ClientErrorKind, ClientErrorReport } from "./client-errors.ts";

export { CurrentMember } from "./current-member.ts";

export { CurrentStaff } from "./current-staff.ts";

export type { Staff } from "./current-staff.ts";

export { CurrentPrincipal } from "./current-principal.ts";

export { Forbidden } from "./forbidden.ts";

export { InvalidDateRange } from "./invalid-date-range.ts";

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
  MediaUsageSchema,
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
  MediaUsage,
  NewUpload,
  PreparedUpload,
  SignedRequest,
  UploadPart,
  UploadTarget,
} from "./media.ts";

export { MediaInUse } from "./media-in-use.ts";

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
  WebhookTurnOffReasonSchema,
} from "./notices.ts";

export type {
  MarkNoticesRead,
  Notice,
  NoticeChannel,
  NoticeEvent,
  NoticePage,
  UnreadNotices,
  WebhookTurnOffReason,
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

export { InstagramConnectionSchema, PlatformSchema } from "./platform.ts";

export type { InstagramConnection, Platform } from "./platform.ts";

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
  AttemptResultSchema,
  defaultDraftPageSize,
  DraftPageSchema,
  FailureReasonSchema,
  maxDraftPageSize,
  MediaAttachmentSchema,
  PostContentSchema,
  PostDraftSchema,
  PostOutcomeSchema,
  PostScheduleSchema,
  PostSchema,
  PostTargetSchema,
  PublicationAttemptSchema,
  SchedulePostSchema,
  TargetConfirmationSchema,
  TextOverrideSchema,
  UnconfirmedReasonSchema,
} from "./posts.ts";

export type {
  AttemptResult,
  DraftPage,
  FailureReason,
  MediaAttachment,
  Post,
  PostContent,
  PostDraft,
  PostOutcome,
  PostSchedule,
  PostTarget,
  PublicationAttempt,
  SchedulePost,
  TargetConfirmation,
  TextOverride,
  UnconfirmedReason,
} from "./posts.ts";

export {
  ChannelOptionsSchema,
  maxYouTubeTagsLength,
  maxYouTubeTitleLength,
  optionsPlatforms,
  TargetOptionsSchema,
  TikTokOptionsSchema,
  TikTokPrivacyLevelSchema,
  YouTubeOptionsSchema,
  YouTubePrivacySchema,
  youTubeTagsLength,
} from "./target-options.ts";

export type {
  ChannelOptions,
  OptionsPlatform,
  TargetOptions,
  TikTokOptions,
  TikTokPrivacyLevel,
  YouTubeOptions,
  YouTubePrivacy,
} from "./target-options.ts";

export { PostTargetStatusSchema } from "./post-target-status.ts";

export type { PostTargetStatus } from "./post-target-status.ts";

export { TargetStatusConflict } from "./target-status-conflict.ts";

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

export {
  maxStaffReasonLength,
  StaffActionSchema,
  StaffApi,
  StaffAuditEventSchema,
  StaffAuditPageSchema,
  StaffBanPayloadSchema,
  StaffChannelSchema,
  StaffFailureSchema,
  StaffPostCountsSchema,
  staffPageSize,
  StaffReasonPayloadSchema,
  StaffReasonSchema,
  StaffSessionSchema,
  StaffSystemSchema,
  StaffUserPageSchema,
  StaffUserSchema,
  StaffUserSummarySchema,
  StaffWebhookSchema,
  StaffWorkspacePageSchema,
  StaffWorkspaceSchema,
  StaffWorkspaceSummarySchema,
} from "./staff.ts";

export type {
  StaffAction,
  StaffAuditEvent,
  StaffAuditPage,
  StaffBanPayload,
  StaffChannel,
  StaffFailure,
  StaffPostCounts,
  StaffReasonPayload,
  StaffSession,
  StaffSystem,
  StaffUser,
  StaffUserPage,
  StaffUserSummary,
  StaffWebhook,
  StaffWorkspace,
  StaffWorkspacePage,
  StaffWorkspaceSummary,
} from "./staff.ts";

export {
  LegalAnswerSchema,
  LegalApi,
  LegalConnectionSchema,
  LegalHeldAccountSchema,
  LegalRequestSchema,
  LegalSubjectSchema,
  maxLegalTextLength,
} from "./legal.ts";

export type { LegalAnswer, LegalRequest, LegalSubject } from "./legal.ts";

export { StaffAccess } from "./staff-access.ts";

export {
  StaffActionRefused,
  StaffRefusalSchema,
} from "./staff-action-refused.ts";

export type { StaffRefusal } from "./staff-action-refused.ts";

export { TooManyClientErrors } from "./too-many-client-errors.ts";

export { Unauthenticated } from "./unauthenticated.ts";

export { UnknownChannels } from "./unknown-channels.ts";

export { UnknownMedia } from "./unknown-media.ts";

export { UnsupportedMediaType } from "./unsupported-media-type.ts";

export { UploadIncomplete } from "./upload-incomplete.ts";

export { UploadRejected } from "./upload-rejected.ts";

export { UserNotFound } from "./user-not-found.ts";

export { TooManyWebhookEndpoints } from "./too-many-webhook-endpoints.ts";

export { WebhookDeliveryNotFound } from "./webhook-delivery-not-found.ts";

export { WebhookEndpointDisabled } from "./webhook-endpoint-disabled.ts";

export { WebhookEndpointNotFound } from "./webhook-endpoint-not-found.ts";

export {
  MediaFailureReasonSchema,
  SubscribableWebhookEventTypeSchema,
  webhookEventVersion,
  WebhookEventTypeSchema,
  WebhookPayloadSchema,
  WebhookTargetSchema,
} from "./webhook-events.ts";

export type {
  MediaFailureReason,
  SubscribableWebhookEventType,
  WebhookEventType,
  WebhookPayload,
  WebhookTarget,
} from "./webhook-events.ts";

export {
  WebhookUrlRefusalSchema,
  WebhookUrlRefused,
} from "./webhook-url-refused.ts";

export type { WebhookUrlRefusal } from "./webhook-url-refused.ts";

export {
  defaultWebhookDeliveryPageSize,
  maxWebhookAttempts,
  maxWebhookDeliveryPageSize,
  maxWebhookDescriptionLength,
  maxWebhookEndpoints,
  maxWebhookUrlLength,
  NewWebhookEndpointSchema,
  WebhookAttemptErrorSchema,
  WebhookDeliveryFailureSchema,
  WebhookDeliveryPageSchema,
  WebhookDeliverySchema,
  webhookDeliveryRetentionDays,
  WebhookDeliveryStatusSchema,
  WebhookDisabledReasonSchema,
  WebhookEndpointChangeSchema,
  WebhookEndpointSchema,
  WebhookEndpointSecretSchema,
  webhookFailingDays,
  WebhooksApi,
  webhookSecretOverlapHours,
} from "./webhooks.ts";

export type {
  NewWebhookEndpoint,
  WebhookAttemptError,
  WebhookDelivery,
  WebhookDeliveryFailure,
  WebhookDeliveryPage,
  WebhookDeliveryStatus,
  WebhookDisabledReason,
  WebhookEndpoint,
  WebhookEndpointChange,
  WebhookEndpointSecret,
} from "./webhooks.ts";

export { WebhooksNotConfigured } from "./webhooks-not-configured.ts";

export { WorkspaceAccess } from "./workspace-access.ts";

export { WorkspaceNotFound } from "./workspace-not-found.ts";

// The one definition of the HTTP API. The server implements it; the web app,
// the CLI and the MCP server derive their typed clients from it, and the docs
// render its OpenAPI document.
export class Api extends HttpApi.make("peal")
  .add(SystemApi)
  .add(SessionApi)
  .add(ApiKeysApi)
  .add(ChannelsApi)
  .add(ChannelOAuthApi)
  .add(DataDeletionApi)
  .add(PostsApi)
  .add(MediaApi)
  .add(NoticesApi)
  .add(NotificationPreferencesApi)
  .add(AssistantApi)
  .add(WorkspacesApi)
  .add(MembersApi)
  .add(InvitationsApi)
  .add(AccountApi)
  .add(ConnectedAppsApi)
  .add(BillingApi)
  .add(BillingActionsApi)
  .add(CaptchaApi)
  .add(AnalyticsApi)
  .add(TikTokApi)
  .add(WebhooksApi)
  .add(StaffApi)
  .add(LegalApi)
  .add(ClientErrorsApi)
  // The contract is Apache-2.0, unlike the rest of Peal, so the clients
  // generated from this document may be too.
  .annotateMerge(
    OpenApi.annotations({
      license: { identifier: "Apache-2.0", name: "Apache-2.0" },
      title: "Peal API",
    })
  ) {}
