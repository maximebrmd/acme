import { HttpApi, OpenApi } from "effect/http-api";

import { AccountApi } from "./account.ts";
import { ActivityApi } from "./activity.ts";
import { AnalyticsApi } from "./analytics.ts";
import { ApiKeysApi } from "./api-keys.ts";
import { AssistantApi } from "./assistant.ts";
import { BillingActionsApi } from "./billing-actions.ts";
import { BillingApi } from "./billing.ts";
import { CapabilitiesApi } from "./capabilities.ts";
import { CaptchaApi } from "./captcha.ts";
import { ChannelOAuthApi } from "./channel-oauth.ts";
import { ChannelsApi } from "./channels.ts";
import { ClientErrorsApi } from "./client-errors.ts";
import { ConnectLinksApi } from "./connect-links.ts";
import { ConnectedAppsApi } from "./connected-apps.ts";
import { ContractRequestsDeskApi } from "./contract-requests-desk.ts";
import { ContractRequestsApi } from "./contract-requests.ts";
import { DataDeletionApi } from "./data-deletion.ts";
import { HostedConnectApi } from "./hosted-connect.ts";
import { InboxApi } from "./inbox.ts";
import { InvitationsApi } from "./invitations.ts";
import { LegalApi } from "./legal.ts";
import { LookupsApi } from "./lookups.ts";
import { MediaApi } from "./media.ts";
import { MembersApi } from "./members.ts";
import { NoticesApi } from "./notices.ts";
import { NotificationPreferencesApi } from "./notification-preferences.ts";
import { PartnerAccountApi } from "./partner-account.ts";
import { PartnerApi } from "./partner.ts";
import { PostsApi } from "./posts.ts";
import { ReviewLinkApi } from "./review-link.ts";
import { ReviewApi } from "./review.ts";
import { SessionApi } from "./session.ts";
import { StaffApi } from "./staff.ts";
import { SystemApi } from "./system.ts";
import { TikTokApi } from "./tiktok.ts";
import { WebhooksApi } from "./webhooks.ts";
import { WorkspacesApi } from "./workspaces.ts";

export { DatabaseUnavailable } from "./database-unavailable.ts";

export {
  ActivityActorSchema,
  ActivityApi,
  ActivityApplicationSchema,
  ActivityEventSchema,
  ActivityPageSchema,
  activityRetentionDays,
  ActivityViaSchema,
  defaultActivityPageSize,
  maxActivityPageSize,
} from "./activity.ts";

export type {
  ActivityActor,
  ActivityApplication,
  ActivityEvent,
  ActivityPage,
  ActivityVia,
} from "./activity.ts";

export {
  AccountApi,
  AccountClosureSchema,
  AccountExportSchema,
  DeleteAccountSchema,
} from "./account.ts";

export type {
  AccountClosure,
  AccountExport,
  DeleteAccount,
} from "./account.ts";

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

export { DeletionIncomplete } from "./deletion-incomplete.ts";

export { BillingNotEnabled } from "./billing-not-enabled.ts";

export {
  DesiredDayTooFar,
  desiredDayHorizonDays,
} from "./desired-day-too-far.ts";

export { NothingToCancel } from "./nothing-to-cancel.ts";

export { ReductionRefused } from "./reduction-refused.ts";

export { PlanTooSmall } from "./plan-too-small.ts";

export { TrialUnavailable } from "./trial-unavailable.ts";

export { WithdrawalUnavailable } from "./withdrawal-unavailable.ts";

export { WorkspaceNameMismatch } from "./workspace-name-mismatch.ts";

export { AltTextTooLong } from "./alt-text-too-long.ts";

export {
  AnalyticsApi,
  AnalyticsDashboardSchema,
  AnalyticsSummarySchema,
  CalendarDaySchema,
  ChannelDashboardSchema,
  ChannelDaySchema,
  ChannelMetricsSchema,
  ChannelSeriesSchema,
  countedPlatforms,
  DashboardDaySchema,
  dashboardPeriods,
  DashboardTotalsSchema,
  EngagementDaySchema,
  exportColumns,
  ExportFormatSchema,
  ExportKindSchema,
  FollowerChangeSchema,
  maxTopPosts,
  PlatformDashboardSchema,
  MetricsSnapshotSchema,
  MetricTotalsSchema,
  PostAnalyticsSchema,
  PostMetricsSchema,
  TargetMetricsSchema,
  TopPostSchema,
} from "./analytics.ts";

export type {
  AnalyticsDashboard,
  AnalyticsSummary,
  CalendarDay,
  ChannelDashboard,
  ChannelDay,
  ChannelMetrics,
  ChannelSeries,
  DashboardDay,
  DashboardTotals,
  EngagementDay,
  ExportFormat,
  ExportKind,
  FollowerChange,
  PlatformDashboard,
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

export { CaptchaRefused } from "./captcha-refused.ts";

export { ContractRequestIntake } from "./contract-request-intake.ts";

export { ContractRequestNotFound } from "./contract-request-not-found.ts";

export { ContractRequestSettled } from "./contract-request-settled.ts";

export {
  ContractDaySchema,
  ContractFunctionsSchema,
  ContractRequestKindSchema,
  ContractRequestOutcomeSchema,
  ContractRequestPreviewSchema,
  ContractRequestReceiptSchema,
  ContractRequestRefusalSchema,
  ContractRequestsApi,
  ContractRequestStatusSchema,
  contractRequestTextPattern,
  HeldContractSchema,
  maxContractRequestEmail,
  maxContractRequestText,
  NewContractRequestSchema,
} from "./contract-requests.ts";

export {
  ContractRequestsDeskApi,
  OpenContractRequestSchema,
} from "./contract-requests-desk.ts";

export type { OpenContractRequest } from "./contract-requests-desk.ts";

export type {
  ContractFunctions,
  ContractRequestKind,
  ContractRequestOutcome,
  ContractRequestPreview,
  ContractRequestReceipt,
  ContractRequestRefusal,
  ContractRequestStatus,
  HeldContract,
  NewContractRequest,
} from "./contract-requests.ts";

export { TooManyContractRequests } from "./too-many-contract-requests.ts";

export {
  BillingApi,
  BillingSchema,
  BillingSubscriptionSchema,
  CancellationSchema,
  CancelPayloadSchema,
  ExcessSchema,
  HeldLimitSchema,
  OrderPayloadSchema,
  OrderSchema,
  PeriodUsageSchema,
  PlanAllowancesSchema,
  PlanOfferSchema,
  PlanPriceSchema,
  ReductionPayloadSchema,
  ReductionSchema,
  StandingSchema,
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
  Excess,
  HeldLimit,
  Order,
  OrderPayload,
  PeriodUsage,
  PlanAllowances,
  PlanOffer,
  PlanPrice,
  Reduction,
  ReductionPayload,
  Standing,
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

export {
  accountNumberNames,
  AccountRestrictionSchema,
  AccountStandingSchema,
  AccountUnreadReasonSchema,
  CapabilitiesApi,
  capabilitiesVersion,
  ChannelCapabilitiesSchema,
  MediaCapabilitiesSchema,
  MediaFormatSchema,
  OptionConstraintSchema,
  PlatformCapabilitiesSchema,
  postCountNames,
  TextCapabilitiesSchema,
  TextLimitSchema,
} from "./capabilities.ts";

export type {
  AccountRestriction,
  AccountStanding,
  ChannelCapabilities,
  MediaFormat,
  OptionConstraint,
  PlatformCapabilities,
  TextLimit,
} from "./capabilities.ts";

export {
  FieldDefaultSchema,
  FieldDescriptionSchema,
  FieldTypeSchema,
} from "./field-description.ts";

export type { FieldDescription, FieldType } from "./field-description.ts";

export { LookupInputInvalid } from "./lookup-input-invalid.ts";

export { LookupNameSchema } from "./lookup-name.ts";

export type { LookupName } from "./lookup-name.ts";

export { LookupNotFound } from "./lookup-not-found.ts";

export {
  LinkedInOrganizationSchema,
  LookupDescriptionSchema,
  LookupInputSchema,
  LookupResultSchema,
  LookupsApi,
  maxLookupPageSize,
  PinterestBoardSchema,
  PinterestBoardSectionSchema,
  YouTubePlaylistSchema,
  YouTubeVideoCategorySchema,
} from "./lookups.ts";

export type {
  LookupDescription,
  LookupInput,
  LookupResult,
} from "./lookups.ts";

export { PlatformRateLimited } from "./platform-rate-limited.ts";

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

export {
  apiChangelog,
  ApiChangelogEntrySchema,
  ApiChangelogSchema,
  BreakingChangeSchema,
} from "./api-changelog.ts";

export type { ApiChangelog, ApiChangelogEntry } from "./api-changelog.ts";

export { deprecated, Deprecation } from "./deprecation.ts";

export type { DeprecationNotice } from "./deprecation.ts";

export { errorCodeOf } from "./error-code.ts";

export { errorEnvelope } from "./error-envelope.ts";

export { Forbidden, ForbiddenReasonSchema } from "./forbidden.ts";

export type { ForbiddenReason } from "./forbidden.ts";

export {
  InvalidRequest,
  maxRequestIssues,
  RequestIssueSchema,
} from "./invalid-request.ts";

export type { RequestIssue } from "./invalid-request.ts";

export { InvalidDateRange } from "./invalid-date-range.ts";

export { InvalidTimeRange } from "./invalid-time-range.ts";

export { InvalidTimeZone } from "./invalid-time-zone.ts";

export {
  defaultMediaPageSize,
  maxMediaPageSize,
  maxMediaUrlLength,
  MediaContentTypeSchema,
  MediaDescriptionSchema,
  MediaImportSchema,
  mediaImportSeconds,
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
  MediaImport,
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

export { MediaImportBusy } from "./media-import-busy.ts";

export { MediaSourceNotPublic } from "./media-source-not-public.ts";

export {
  MediaSourceFailureSchema,
  MediaSourceUnreachable,
} from "./media-source-unreachable.ts";

export type { MediaSourceFailure } from "./media-source-unreachable.ts";

export { MediaTooLarge } from "./media-too-large.ts";

export { PermissionSchema } from "./permission.ts";

export type { Permission } from "./permission.ts";

export { PlanLimitReached } from "./plan-limit-reached.ts";

export {
  ChannelConnectionSchema,
  InstagramConnectionSchema,
  LinkedInConnectionSchema,
  PlatformSchema,
} from "./platform.ts";

export type {
  ChannelConnection,
  InstagramConnection,
  LinkedInConnection,
  Platform,
} from "./platform.ts";

export {
  ContentViolationSchema,
  PostContentInvalid,
} from "./post-content-invalid.ts";

export type { ContentViolation } from "./post-content-invalid.ts";

export { PostNotFound } from "./post-not-found.ts";

export { PostStatusConflict } from "./post-status-conflict.ts";

export { PostStatusSchema } from "./post-status.ts";

export type { PostStatus } from "./post-status.ts";

export { IdempotencyKeyReused } from "./idempotency-key-reused.ts";

export { ImportProblemSchema, ImportUnreadable } from "./import-unreadable.ts";

export type { ImportProblem } from "./import-unreadable.ts";

export {
  ImportCellProblemSchema,
  ImportColumnSchema,
  importColumns,
  maxBulkPosts,
  maxImportLength,
  maxImportRows,
  PostRefusalSchema,
} from "./post-batches.ts";

export type {
  ImportCellProblem,
  ImportColumn,
  PostRefusal,
} from "./post-batches.ts";

export {
  DuplicateOnChannelSchema,
  DuplicatePost,
  duplicateWindowHours,
} from "./duplicate-post.ts";

export type { DuplicateOnChannel } from "./duplicate-post.ts";

export {
  ChannelPreviewSchema,
  LimitedCountSchema,
  PartPreviewSchema,
  PlanShortfallSchema,
  PostValidationSchema,
  ScheduleCheckSchema,
  TextCountSchema,
} from "./post-validation.ts";

export type {
  ChannelPreview,
  LimitedCount,
  PartPreview,
  PlanShortfall,
  PostValidation,
  ScheduleCheck,
  TextCount,
} from "./post-validation.ts";

export {
  AttemptResultSchema,
  BulkPostResultSchema,
  BulkPostSchema,
  BulkPostsSchema,
  BulkResultSchema,
  defaultDraftPageSize,
  defaultPostPageSize,
  DraftPageSchema,
  FailureReasonSchema,
  idempotencyKeyLifetimeHours,
  LivePartSchema,
  ImportResultSchema,
  ImportRowResultSchema,
  maxDraftPageSize,
  maxIdempotencyKeyLength,
  maxOutcomeWaitSeconds,
  maxPostPageSize,
  MediaAttachmentSchema,
  NewPostSchema,
  PostContentSchema,
  PostDraftSchema,
  PostImportSchema,
  PostOriginSchema,
  PostOriginViaSchema,
  PostOutcomeSchema,
  PostPartSchema,
  PostChannelSchema,
  PostPageSchema,
  PostScheduleSchema,
  PostSchema,
  PostSortSchema,
  PostTargetSchema,
  PostTimingSchema,
  PostToValidateSchema,
  PublicationAttemptSchema,
  SchedulePostSchema,
  TargetConfirmationSchema,
  TargetPartsSchema,
  TextOverrideSchema,
  UnconfirmedReasonSchema,
} from "./posts.ts";

export type {
  AttemptResult,
  BulkPost,
  BulkPostResult,
  BulkPosts,
  BulkResult,
  DraftPage,
  ImportResult,
  ImportRowResult,
  PostImport,
  FailureReason,
  LivePart,
  MediaAttachment,
  NewPost,
  Post,
  PostContent,
  PostDraft,
  PostOrigin,
  PostOriginVia,
  PostChannel,
  PostOutcome,
  PostPart,
  PostPage,
  PostSchedule,
  PostSort,
  PostTarget,
  PostTiming,
  PostToValidate,
  PublicationAttempt,
  SchedulePost,
  TargetConfirmation,
  TargetParts,
  TextOverride,
  UnconfirmedReason,
} from "./posts.ts";

export {
  ChannelOptionsSchema,
  GoogleBusinessCallToActionSchema,
  googleBusinessLocalTimePattern,
  GoogleBusinessOptionsSchema,
  GoogleBusinessPostTypeSchema,
  maxGoogleBusinessTitleLength,
  maxPinterestLinkLength,
  maxPinterestTitleLength,
  LinkedInMentionSchema,
  LinkedInOptionsSchema,
  LinkedInVisibilitySchema,
  maxLinkedInDocumentTitleLength,
  maxLinkedInLinkDescriptionLength,
  maxLinkedInLinkTitleLength,
  maxLinkedInLinkUrlLength,
  maxLinkedInMentionNameLength,
  maxLinkedInMentions,
  maxYouTubeTagsLength,
  maxYouTubeTitleLength,
  optionsPlatforms,
  PinterestOptionsSchema,
  TargetOptionsSchema,
  TikTokOptionsSchema,
  TikTokPrivacyLevelSchema,
  YouTubeOptionsSchema,
  YouTubePrivacySchema,
  youTubeTagsLength,
} from "./target-options.ts";

export type {
  ChannelOptions,
  GoogleBusinessCallToAction,
  GoogleBusinessOptions,
  GoogleBusinessPostType,
  LinkedInMention,
  LinkedInOptions,
  LinkedInVisibility,
  OptionsPlatform,
  PinterestOptions,
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
  StaffPartnerSchema,
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
  StaffPartner,
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
  LegalCoverSchema,
  LegalDisclosurePageSchema,
  LegalDisclosureSchema,
  legalDisclosureYears,
  LegalHeldAccountSchema,
  LegalRequestSchema,
  LegalSubjectSchema,
  maxLegalTextLength,
} from "./legal.ts";

export type {
  LegalAnswer,
  LegalCover,
  LegalDisclosure,
  LegalDisclosurePage,
  LegalRequest,
  LegalSubject,
} from "./legal.ts";

export { StaffAccess } from "./staff-access.ts";

export {
  StaffActionRefused,
  StaffRefusalSchema,
} from "./staff-action-refused.ts";

export type { StaffRefusal } from "./staff-action-refused.ts";

export { TooManyClientErrors } from "./too-many-client-errors.ts";

export { TooManyRequests } from "./too-many-requests.ts";

export { Unauthenticated } from "./unauthenticated.ts";

export { UnknownChannels } from "./unknown-channels.ts";

export { UnknownMedia } from "./unknown-media.ts";

export { UnsupportedMediaType } from "./unsupported-media-type.ts";

export { UploadIncomplete } from "./upload-incomplete.ts";

export { UploadRejected } from "./upload-rejected.ts";

export { UserNotFound } from "./user-not-found.ts";

export { TooManyWebhookEndpoints } from "./too-many-webhook-endpoints.ts";

export { TooManyWebhookSends } from "./too-many-webhook-sends.ts";

export { WebhookDeliveryNotFound } from "./webhook-delivery-not-found.ts";

export { WebhookEndpointDisabled } from "./webhook-endpoint-disabled.ts";

export { WebhookEndpointNotFound } from "./webhook-endpoint-not-found.ts";

export {
  MediaFailureReasonSchema,
  WebhookReviewPartySchema,
  SubscribableWebhookEventTypeSchema,
  webhookEventVersion,
  WebhookEventTypeSchema,
  WebhookPayloadSchema,
  WebhookTargetSchema,
} from "./webhook-events.ts";

export type {
  MediaFailureReason,
  WebhookReviewParty,
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
  webhookManualSendsPerHour,
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
  WebhookEndpointScopeSchema,
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
  WebhookEndpointScope,
  WebhookEndpointSecret,
} from "./webhooks.ts";

export { WebhooksNotConfigured } from "./webhooks-not-configured.ts";

export {
  defaultInboxPageSize,
  InboxAbilitiesSchema,
  InboxAbilitySchema,
  InboxAbilityStandingSchema,
  InboxApi,
  InboxAuthorSchema,
  InboxCollectionEndSchema,
  InboxCommentSchema,
  InboxCommentStateSchema,
  InboxModerationActionSchema,
  inboxPlatforms,
  InboxReplyReasonSchema,
  InboxReplySchema,
  InboxReplyStatusSchema,
  inboxRetentionDays,
  InboxThreadDetailSchema,
  InboxThreadPageSchema,
  InboxThreadSchema,
  inboxWindowDays,
  maxInboxPageSize,
  maxInboxReplyLength,
  NewInboxReplySchema,
} from "./inbox.ts";

export type {
  InboxAbilities,
  InboxAbility,
  InboxAbilityStanding,
  InboxAuthor,
  InboxCollectionEnd,
  InboxComment,
  InboxCommentState,
  InboxModerationAction,
  InboxReply,
  InboxReplyReason,
  InboxReplyStatus,
  InboxThread,
  InboxThreadDetail,
  InboxThreadPage,
  NewInboxReply,
} from "./inbox.ts";

export { InboxActionFailed } from "./inbox-action-failed.ts";

export { InboxActionUnavailable } from "./inbox-action-unavailable.ts";

export { InboxCommentGone } from "./inbox-comment-gone.ts";

export { InboxCommentNotFound } from "./inbox-comment-not-found.ts";

export { InboxReplyNotFound } from "./inbox-reply-not-found.ts";

export { InboxThreadNotFound } from "./inbox-thread-not-found.ts";

export { ReplyInvalid } from "./reply-invalid.ts";

export { ReplyPending } from "./reply-pending.ts";

export { ReplyStatusConflict } from "./reply-status-conflict.ts";

export { ConnectLinkIntake } from "./connect-link-intake.ts";

export { ConnectLinkNotFound } from "./connect-link-not-found.ts";

export {
  ConnectLinkLocaleSchema,
  connectLinkRetentionDays,
  ConnectLinksApi,
  ConnectLinkSchema,
  ConnectLinkStatusSchema,
  CreatedConnectLinkSchema,
  defaultConnectLinkHours,
  maxConnectLinkHours,
  maxConnectLinkStarts,
  maxPendingConnectLinks,
  maxReturnUrlLength,
  minConnectLinkHours,
  NewConnectLinkSchema,
} from "./connect-links.ts";

export type {
  ConnectLink,
  ConnectLinkStatus,
  CreatedConnectLink,
  NewConnectLink,
} from "./connect-links.ts";

export {
  connectLinkCookie,
  HostedAuthorizationSchema,
  HostedChannelSchema,
  HostedConnectApi,
  HostedLinkInputSchema,
  HostedLinkSchema,
  HostedOutcomeSchema,
  HostedStartSchema,
  connectLinkTokenHeader,
} from "./hosted-connect.ts";

export type { HostedLink, HostedOutcome } from "./hosted-connect.ts";

export {
  HostedConnectFailed,
  HostedConnectFailureSchema,
} from "./hosted-connect-failed.ts";

export type { HostedConnectFailure } from "./hosted-connect-failed.ts";

export { ReturnUrlNotAllowed } from "./return-url-not-allowed.ts";

export { TooManyConnectAttempts } from "./too-many-connect-attempts.ts";

export { TooManyConnectLinks } from "./too-many-connect-links.ts";

export { ExternalIdTaken } from "./external-id-taken.ts";

export { PartnerAccountsClosed } from "./partner-accounts-closed.ts";

export { PartnerDetailsInvalid } from "./partner-details-invalid.ts";

export { PartnerKeyNotFound } from "./partner-key-not-found.ts";

export { PartnerNotFound } from "./partner-not-found.ts";

export { PartnerOwnsWorkspaces } from "./partner-owns-workspaces.ts";

export { PartnerScopeSchema } from "./partner-scope.ts";

export type { PartnerScope } from "./partner-scope.ts";

export {
  creationKeyLifetimeHours,
  CustomerWorkspaceChangeSchema,
  CustomerWorkspacePageSchema,
  CustomerWorkspaceSchema,
  defaultWorkspacePageSize,
  maxCreationKeyLength,
  maxExternalIdLength,
  maxPartnerLogoUrlLength,
  maxPartnerNameLength,
  maxReturnOrigins,
  maxWorkspaceNameLength,
  maxWorkspacePageSize,
  NewCustomerWorkspaceSchema,
  PartnerApi,
  PartnerOverviewSchema,
  PartnerSchema,
  PartnerUsageDaySchema,
  PartnerUsageSchema,
} from "./partner.ts";

export type {
  CustomerWorkspace,
  CustomerWorkspaceChange,
  CustomerWorkspacePage,
  NewCustomerWorkspace,
  Partner,
  PartnerOverview,
  PartnerUsage,
} from "./partner.ts";

export {
  CreatedPartnerKeySchema,
  maxPartnerKeyNameLength,
  NewPartnerKeySchema,
  OpenPartnerSchema,
  PartnerAccountApi,
  PartnerChangeSchema,
  PartnerKeySchema,
  partnerKeyPermissions,
  PartnerStandingSchema,
} from "./partner-account.ts";

export type {
  NewPartnerKey,
  PartnerChange,
  PartnerKey,
  PartnerStanding,
} from "./partner-account.ts";

export { WorkspaceAccess } from "./workspace-access.ts";

export { ApprovalChanged } from "./approval-changed.ts";

export { WorkspaceOverPlan } from "./workspace-over-plan.ts";

export { ApprovalNotPending } from "./approval-not-pending.ts";

export { CommentInvalid, CommentProblemSchema } from "./comment-invalid.ts";

export type { CommentProblem } from "./comment-invalid.ts";

export { CommentNotFound } from "./comment-not-found.ts";

export { PostNotReviewable } from "./post-not-reviewable.ts";

export { ReviewAccessDenied } from "./review-access-denied.ts";

export { ReviewCaptchaRequired } from "./review-captcha-required.ts";

export { ReviewLinkAccessSchema } from "./review-link-access.ts";

export type { ReviewLinkAccess } from "./review-link-access.ts";

export {
  ReviewLinkClosed,
  ReviewLinkClosureSchema,
} from "./review-link-closed.ts";

export type { ReviewLinkClosure } from "./review-link-closed.ts";

export { ReviewLinkNotFound } from "./review-link-not-found.ts";

export {
  ReviewLinkApi,
  ReviewPageSchema,
  VisitorApprovalSchema,
  VisitorChangesSchema,
  VisitorCommentSchema,
} from "./review-link.ts";

export type {
  ReviewPage,
  VisitorApproval,
  VisitorChanges,
  VisitorComment,
} from "./review-link.ts";

export { ReviewRequestTooLarge } from "./review-request-too-large.ts";

export { ReviewVisitorAddress } from "./review-visitor-address.ts";

export { maxReviewRequestBytes, ReviewVisitor } from "./review-visitor.ts";

export { TooManyReviewLinks } from "./too-many-review-links.ts";

export { TooManyReviewRequests } from "./too-many-review-requests.ts";

export {
  ApprovalOriginSchema,
  ApprovalOutcomeSchema,
  ApprovalPolicySchema,
  ApprovalRequestSchema,
  ApprovalStatusSchema,
  ChangesOutcomeSchema,
  ApprovalDecisionSchema,
  ChangesRequestSchema,
  ReviewedChannelSchema,
  ReviewedMediaSchema,
  maxSubjectHashLength,
  CommentAnchorSchema,
  CommentSelectionSchema,
  CreatedReviewLinkSchema,
  defaultReviewLinkHours,
  maxCommentLength,
  maxQuoteLength,
  maxReviewLinkHours,
  maxReviewLinksPerPost,
  maxVisitorNameLength,
  NewCommentSchema,
  NewReviewLinkSchema,
  PostReviewSchema,
  ReviewApi,
  ReviewCommentSchema,
  ReviewerKindSchema,
  ReviewerSchema,
  ReviewLinkSchema,
  ReviewLinkStatusSchema,
  ReviewSettingsSchema,
} from "./review.ts";

export type {
  ApprovalOrigin,
  ApprovalOutcome,
  ApprovalPolicy,
  ApprovalRequest,
  ApprovalStatus,
  ChangesOutcome,
  ApprovalDecision,
  ChangesRequest,
  ReviewedChannel,
  ReviewedMedia,
  CommentAnchor,
  CommentSelection,
  CreatedReviewLink,
  NewComment,
  NewReviewLink,
  PostReview,
  ReviewComment,
  Reviewer,
  ReviewerKind,
  ReviewLink,
  ReviewLinkStatus,
  ReviewSettings,
} from "./review.ts";

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
  .add(CapabilitiesApi)
  .add(LookupsApi)
  .add(WebhooksApi)
  .add(InboxApi)
  .add(ActivityApi)
  .add(PartnerApi)
  .add(PartnerAccountApi)
  .add(ConnectLinksApi)
  .add(HostedConnectApi)
  .add(StaffApi)
  .add(LegalApi)
  .add(ClientErrorsApi)
  .add(ReviewApi)
  .add(ReviewLinkApi)
  .add(ContractRequestsApi)
  .add(ContractRequestsDeskApi)
  // The contract is Apache-2.0, unlike the rest of Peal, so the clients
  // generated from this document may be too.
  .annotateMerge(
    OpenApi.annotations({
      license: { identifier: "Apache-2.0", name: "Apache-2.0" },
      title: "Peal API",
    })
  ) {}

export {
  complaintRight,
  dataRights,
  processingLocales,
  processingRegister,
  recipientCategories,
  retentionPeriods,
  retentionTable,
} from "./data-processing.ts";

export type {
  DataRight,
  ProcessingCategory,
  ProcessingCondition,
  ProcessingLocale,
  ProcessingText,
  RecipientCategory,
} from "./data-processing.ts";
