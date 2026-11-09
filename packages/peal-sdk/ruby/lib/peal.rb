# frozen_string_literal: true

require "json"
require "net/http"
require "securerandom"
require "time"

require_relative "peal/version"
require_relative "peal/internal/json/serializable"
require_relative "peal/internal/types/type"
require_relative "peal/internal/types/utils"
require_relative "peal/internal/types/union"
require_relative "peal/internal/errors/constraint_error"
require_relative "peal/internal/errors/type_error"
require_relative "peal/internal/http/base_request"
require_relative "peal/internal/json/request"
require_relative "peal/internal/http/raw_client"
require_relative "peal/internal/multipart/multipart_encoder"
require_relative "peal/internal/multipart/multipart_form_data_part"
require_relative "peal/internal/multipart/multipart_form_data"
require_relative "peal/internal/multipart/multipart_request"
require_relative "peal/internal/types/model/field"
require_relative "peal/internal/types/model"
require_relative "peal/internal/types/array"
require_relative "peal/internal/types/boolean"
require_relative "peal/internal/types/enum"
require_relative "peal/internal/types/hash"
require_relative "peal/internal/types/unknown"
require_relative "peal/errors/api_error"
require_relative "peal/errors/response_error"
require_relative "peal/errors/client_error"
require_relative "peal/errors/redirect_error"
require_relative "peal/errors/server_error"
require_relative "peal/errors/timeout_error"
require_relative "peal/internal/iterators/item_iterator"
require_relative "peal/internal/iterators/cursor_item_iterator"
require_relative "peal/internal/iterators/offset_item_iterator"
require_relative "peal/internal/iterators/cursor_page_iterator"
require_relative "peal/internal/iterators/offset_page_iterator"
require_relative "peal/errors/connection_error"
require_relative "peal/client"
require_relative "peal/system/client"
require_relative "peal/session/client"
require_relative "peal/api_keys/client"
require_relative "peal/api_keys/types/list_api_keys_request"
require_relative "peal/api_keys/types/new_api_key"
require_relative "peal/api_keys/types/revoke_api_keys_request"
require_relative "peal/channels/client"
require_relative "peal/channels/types/list_channels_request"
require_relative "peal/channels/types/platforms_channels_request"
require_relative "peal/channels/types/connect_channel"
require_relative "peal/channels/types/connect_callback"
require_relative "peal/channels/types/choose_accounts"
require_relative "peal/channels/types/reconnect_channels_request"
require_relative "peal/channels/types/disconnect_channels_request"
require_relative "peal/posts/client"
require_relative "peal/posts/types/drafts_posts_request"
require_relative "peal/posts/types/list_posts_request"
require_relative "peal/posts/types/create_posts_request"
require_relative "peal/posts/types/get_posts_request"
require_relative "peal/posts/types/update_posts_request"
require_relative "peal/posts/types/discard_posts_request"
require_relative "peal/posts/types/attempts_posts_request"
require_relative "peal/posts/types/schedule_post"
require_relative "peal/posts/types/reschedule_posts_request"
require_relative "peal/posts/types/unschedule_posts_request"
require_relative "peal/posts/types/repost_posts_request"
require_relative "peal/posts/types/confirm_posts_request"
require_relative "peal/posts/types/cancel_posts_request"
require_relative "peal/media/client"
require_relative "peal/media/types/list_media_request"
require_relative "peal/media/types/new_upload"
require_relative "peal/media/types/get_media_request"
require_relative "peal/media/types/delete_media_request"
require_relative "peal/media/types/media_description"
require_relative "peal/media/types/complete_media_request"
require_relative "peal/media/types/usage_media_request"
require_relative "peal/notices/client"
require_relative "peal/notices/types/list_notices_request"
require_relative "peal/notices/types/mark_notices_read"
require_relative "peal/notification_preferences/client"
require_relative "peal/notification_preferences/types/notification_preferences_change"
require_relative "peal/assistant/client"
require_relative "peal/assistant/types/status_assistant_request"
require_relative "peal/assistant/types/suggestion_request"
require_relative "peal/members/client"
require_relative "peal/members/types/list_members_request"
require_relative "peal/invitations/client"
require_relative "peal/invitations/types/list_invitations_request"
require_relative "peal/invitations/types/new_invitation"
require_relative "peal/invitations/types/revoke_invitations_request"
require_relative "peal/billing/client"
require_relative "peal/billing/types/get_billing_request"
require_relative "peal/analytics/client"
require_relative "peal/analytics/types/summary_analytics_request"
require_relative "peal/analytics/types/post_analytics_request"
require_relative "peal/tiktok/client"
require_relative "peal/tiktok/types/creator_tiktok_request"
require_relative "peal/environment"

module Peal
  module NotificationPreferences
    module Types
      autoload :NotificationPreferencesChangeEmail, ::File.join(__dir__, "peal/notification_preferences/types/notification_preferences_change_email")
    end
  end

  module Types
    autoload :ChannelNotFoundEncoded, ::File.join(__dir__, "peal/types/channel_not_found_encoded")
    autoload :WorkspaceNotFoundEncodedTag, ::File.join(__dir__, "peal/types/workspace_not_found_encoded_tag")
    autoload :WorkspaceNotFoundEncoded, ::File.join(__dir__, "peal/types/workspace_not_found_encoded")
    autoload :NotFoundErrorBody, ::File.join(__dir__, "peal/types/not_found_error_body")
    autoload :AltTextTooLongEncodedTag, ::File.join(__dir__, "peal/types/alt_text_too_long_encoded_tag")
    autoload :AltTextTooLongEncoded, ::File.join(__dir__, "peal/types/alt_text_too_long_encoded")
    autoload :MediaTooLargeEncodedKind, ::File.join(__dir__, "peal/types/media_too_large_encoded_kind")
    autoload :MediaTooLargeEncoded, ::File.join(__dir__, "peal/types/media_too_large_encoded")
    autoload :UnsupportedMediaTypeEncoded, ::File.join(__dir__, "peal/types/unsupported_media_type_encoded")
    autoload :UnprocessableEntityErrorBody, ::File.join(__dir__, "peal/types/unprocessable_entity_error_body")
    autoload :AlreadyMemberEncoded, ::File.join(__dir__, "peal/types/already_member_encoded")
    autoload :TooManyInvitationsEncoded, ::File.join(__dir__, "peal/types/too_many_invitations_encoded")
    autoload :ConflictErrorBody, ::File.join(__dir__, "peal/types/conflict_error_body")
    autoload :CalendarDay, ::File.join(__dir__, "peal/types/calendar_day")
    autoload :ChannelMetrics, ::File.join(__dir__, "peal/types/channel_metrics")
    autoload :EngagementDay, ::File.join(__dir__, "peal/types/engagement_day")
    autoload :MetricTotals, ::File.join(__dir__, "peal/types/metric_totals")
    autoload :PostMetrics, ::File.join(__dir__, "peal/types/post_metrics")
    autoload :TopPost, ::File.join(__dir__, "peal/types/top_post")
    autoload :AnalyticsSummary, ::File.join(__dir__, "peal/types/analytics_summary")
    autoload :Permission, ::File.join(__dir__, "peal/types/permission")
    autoload :APIKey, ::File.join(__dir__, "peal/types/api_key")
    autoload :APIKeyNotFoundEncoded, ::File.join(__dir__, "peal/types/api_key_not_found_encoded")
    autoload :AssistantActionHashtags, ::File.join(__dir__, "peal/types/assistant_action_hashtags")
    autoload :AssistantTone, ::File.join(__dir__, "peal/types/assistant_tone")
    autoload :AssistantActionRewrite, ::File.join(__dir__, "peal/types/assistant_action_rewrite")
    autoload :Platform, ::File.join(__dir__, "peal/types/platform")
    autoload :AssistantActionShorten, ::File.join(__dir__, "peal/types/assistant_action_shorten")
    autoload :TranslationLanguage, ::File.join(__dir__, "peal/types/translation_language")
    autoload :AssistantActionTranslate, ::File.join(__dir__, "peal/types/assistant_action_translate")
    autoload :AssistantAction, ::File.join(__dir__, "peal/types/assistant_action")
    autoload :AssistantFailedEncodedTag, ::File.join(__dir__, "peal/types/assistant_failed_encoded_tag")
    autoload :AssistantFailedEncodedReason, ::File.join(__dir__, "peal/types/assistant_failed_encoded_reason")
    autoload :AssistantFailedEncoded, ::File.join(__dir__, "peal/types/assistant_failed_encoded")
    autoload :AssistantInputRejectedEncodedTag, ::File.join(__dir__, "peal/types/assistant_input_rejected_encoded_tag")
    autoload :AssistantInputRejectedEncodedReason, ::File.join(__dir__, "peal/types/assistant_input_rejected_encoded_reason")
    autoload :AssistantInputRejectedEncoded, ::File.join(__dir__, "peal/types/assistant_input_rejected_encoded")
    autoload :AssistantQuotaExceededEncodedTag, ::File.join(__dir__, "peal/types/assistant_quota_exceeded_encoded_tag")
    autoload :AssistantQuotaExceededEncoded, ::File.join(__dir__, "peal/types/assistant_quota_exceeded_encoded")
    autoload :AssistantStatus, ::File.join(__dir__, "peal/types/assistant_status")
    autoload :AssistantUnavailableEncodedTag, ::File.join(__dir__, "peal/types/assistant_unavailable_encoded_tag")
    autoload :AssistantUnavailableEncoded, ::File.join(__dir__, "peal/types/assistant_unavailable_encoded")
    autoload :AttemptResult, ::File.join(__dir__, "peal/types/attempt_result")
    autoload :Authorization, ::File.join(__dir__, "peal/types/authorization")
    autoload :BillingInterval, ::File.join(__dir__, "peal/types/billing_interval")
    autoload :PaidPlan, ::File.join(__dir__, "peal/types/paid_plan")
    autoload :SubscriptionStatus, ::File.join(__dir__, "peal/types/subscription_status")
    autoload :BillingSubscription, ::File.join(__dir__, "peal/types/billing_subscription")
    autoload :PeriodUsage, ::File.join(__dir__, "peal/types/period_usage")
    autoload :Plan, ::File.join(__dir__, "peal/types/plan")
    autoload :PlanAllowances, ::File.join(__dir__, "peal/types/plan_allowances")
    autoload :PlanPrice, ::File.join(__dir__, "peal/types/plan_price")
    autoload :PlanOffer, ::File.join(__dir__, "peal/types/plan_offer")
    autoload :TrialOffer, ::File.join(__dir__, "peal/types/trial_offer")
    autoload :Usage, ::File.join(__dir__, "peal/types/usage")
    autoload :Billing, ::File.join(__dir__, "peal/types/billing")
    autoload :ChannelStatusActive, ::File.join(__dir__, "peal/types/channel_status_active")
    autoload :ChannelStatusDisabled, ::File.join(__dir__, "peal/types/channel_status_disabled")
    autoload :ChannelStatusRefreshNeeded, ::File.join(__dir__, "peal/types/channel_status_refresh_needed")
    autoload :ChannelStatus, ::File.join(__dir__, "peal/types/channel_status")
    autoload :InstagramConnection, ::File.join(__dir__, "peal/types/instagram_connection")
    autoload :Channel, ::File.join(__dir__, "peal/types/channel")
    autoload :ChannelCannotPostEncodedTag, ::File.join(__dir__, "peal/types/channel_cannot_post_encoded_tag")
    autoload :ChannelCannotPostEncodedReason, ::File.join(__dir__, "peal/types/channel_cannot_post_encoded_reason")
    autoload :ChannelCannotPostEncoded, ::File.join(__dir__, "peal/types/channel_cannot_post_encoded")
    autoload :TikTokPrivacyLevel, ::File.join(__dir__, "peal/types/tik_tok_privacy_level")
    autoload :TikTokOptions, ::File.join(__dir__, "peal/types/tik_tok_options")
    autoload :YouTubePrivacy, ::File.join(__dir__, "peal/types/you_tube_privacy")
    autoload :YouTubeOptions, ::File.join(__dir__, "peal/types/you_tube_options")
    autoload :TargetOptions, ::File.join(__dir__, "peal/types/target_options")
    autoload :ChannelOptions, ::File.join(__dir__, "peal/types/channel_options")
    autoload :ChoosableAccount, ::File.join(__dir__, "peal/types/choosable_account")
    autoload :ConnectFailedEncodedTag, ::File.join(__dir__, "peal/types/connect_failed_encoded_tag")
    autoload :ConnectFailureReason, ::File.join(__dir__, "peal/types/connect_failure_reason")
    autoload :ConnectFailedEncoded, ::File.join(__dir__, "peal/types/connect_failed_encoded")
    autoload :ConnectOutcomeChoose, ::File.join(__dir__, "peal/types/connect_outcome_choose")
    autoload :ConnectOutcomeConnected, ::File.join(__dir__, "peal/types/connect_outcome_connected")
    autoload :ConnectOutcome, ::File.join(__dir__, "peal/types/connect_outcome")
    autoload :ConnectablePlatforms, ::File.join(__dir__, "peal/types/connectable_platforms")
    autoload :ContentViolationAltTextTooLong, ::File.join(__dir__, "peal/types/content_violation_alt_text_too_long")
    autoload :NonFiniteNumber, ::File.join(__dir__, "peal/types/non_finite_number")
    autoload :ContentViolationAspectRatioUnsupportedMaximum, ::File.join(__dir__, "peal/types/content_violation_aspect_ratio_unsupported_maximum")
    autoload :ContentViolationAspectRatioUnsupportedMinimum, ::File.join(__dir__, "peal/types/content_violation_aspect_ratio_unsupported_minimum")
    autoload :ContentViolationAspectRatioUnsupported, ::File.join(__dir__, "peal/types/content_violation_aspect_ratio_unsupported")
    autoload :ContentViolationEmpty, ::File.join(__dir__, "peal/types/content_violation_empty")
    autoload :ContentViolationForbiddenCharacters, ::File.join(__dir__, "peal/types/content_violation_forbidden_characters")
    autoload :ContentViolationMediaRequired, ::File.join(__dir__, "peal/types/content_violation_media_required")
    autoload :ContentViolationMediaTooLarge, ::File.join(__dir__, "peal/types/content_violation_media_too_large")
    autoload :ContentViolationMediaTooSmall, ::File.join(__dir__, "peal/types/content_violation_media_too_small")
    autoload :MediaContentType, ::File.join(__dir__, "peal/types/media_content_type")
    autoload :ContentViolationMediaTypeUnsupported, ::File.join(__dir__, "peal/types/content_violation_media_type_unsupported")
    autoload :ContentViolationMixedMedia, ::File.join(__dir__, "peal/types/content_violation_mixed_media")
    autoload :ContentViolationNoChannels, ::File.join(__dir__, "peal/types/content_violation_no_channels")
    autoload :ContentViolationOptionInvalid, ::File.join(__dir__, "peal/types/content_violation_option_invalid")
    autoload :ContentViolationOptionMissing, ::File.join(__dir__, "peal/types/content_violation_option_missing")
    autoload :ContentViolationOptionTooLong, ::File.join(__dir__, "peal/types/content_violation_option_too_long")
    autoload :ContentViolationOptionsForOtherPlatform, ::File.join(__dir__, "peal/types/content_violation_options_for_other_platform")
    autoload :ContentViolationOptionsWithoutChannel, ::File.join(__dir__, "peal/types/content_violation_options_without_channel")
    autoload :ContentViolationOverrideWithoutChannel, ::File.join(__dir__, "peal/types/content_violation_override_without_channel")
    autoload :ContentViolationSideOutOfRange, ::File.join(__dir__, "peal/types/content_violation_side_out_of_range")
    autoload :TextUnit, ::File.join(__dir__, "peal/types/text_unit")
    autoload :ContentViolationTextTooLong, ::File.join(__dir__, "peal/types/content_violation_text_too_long")
    autoload :ContentViolationTooManyHashtags, ::File.join(__dir__, "peal/types/content_violation_too_many_hashtags")
    autoload :ContentViolationTooManyLinks, ::File.join(__dir__, "peal/types/content_violation_too_many_links")
    autoload :ContentViolationTooManyMedia, ::File.join(__dir__, "peal/types/content_violation_too_many_media")
    autoload :ContentViolationTooManyMentions, ::File.join(__dir__, "peal/types/content_violation_too_many_mentions")
    autoload :ContentViolationTooManyPixels, ::File.join(__dir__, "peal/types/content_violation_too_many_pixels")
    autoload :ContentViolationTooManyVideos, ::File.join(__dir__, "peal/types/content_violation_too_many_videos")
    autoload :ContentViolationVideoTooLong, ::File.join(__dir__, "peal/types/content_violation_video_too_long")
    autoload :ContentViolationVideoTooShort, ::File.join(__dir__, "peal/types/content_violation_video_too_short")
    autoload :ContentViolation, ::File.join(__dir__, "peal/types/content_violation")
    autoload :CreatedAPIKey, ::File.join(__dir__, "peal/types/created_api_key")
    autoload :DatabaseUnavailableEncodedTag, ::File.join(__dir__, "peal/types/database_unavailable_encoded_tag")
    autoload :DatabaseUnavailableEncoded, ::File.join(__dir__, "peal/types/database_unavailable_encoded")
    autoload :FailureReason, ::File.join(__dir__, "peal/types/failure_reason")
    autoload :MediaAttachment, ::File.join(__dir__, "peal/types/media_attachment")
    autoload :TextOverride, ::File.join(__dir__, "peal/types/text_override")
    autoload :PostContent, ::File.join(__dir__, "peal/types/post_content")
    autoload :PostOutcome, ::File.join(__dir__, "peal/types/post_outcome")
    autoload :PostSchedule, ::File.join(__dir__, "peal/types/post_schedule")
    autoload :PostStatus, ::File.join(__dir__, "peal/types/post_status")
    autoload :PostTargetStatus, ::File.join(__dir__, "peal/types/post_target_status")
    autoload :UnconfirmedReason, ::File.join(__dir__, "peal/types/unconfirmed_reason")
    autoload :PostTarget, ::File.join(__dir__, "peal/types/post_target")
    autoload :Post, ::File.join(__dir__, "peal/types/post")
    autoload :DraftPage, ::File.join(__dir__, "peal/types/draft_page")
    autoload :ForbiddenEncodedTag, ::File.join(__dir__, "peal/types/forbidden_encoded_tag")
    autoload :ForbiddenEncoded, ::File.join(__dir__, "peal/types/forbidden_encoded")
    autoload :InvalidDateRangeEncodedTag, ::File.join(__dir__, "peal/types/invalid_date_range_encoded_tag")
    autoload :InvalidDateRangeEncoded, ::File.join(__dir__, "peal/types/invalid_date_range_encoded")
    autoload :InvalidTimeRangeEncodedTag, ::File.join(__dir__, "peal/types/invalid_time_range_encoded_tag")
    autoload :InvalidTimeRangeEncoded, ::File.join(__dir__, "peal/types/invalid_time_range_encoded")
    autoload :InvalidTimeZoneEncodedTag, ::File.join(__dir__, "peal/types/invalid_time_zone_encoded_tag")
    autoload :InvalidTimeZoneEncoded, ::File.join(__dir__, "peal/types/invalid_time_zone_encoded")
    autoload :Invitation, ::File.join(__dir__, "peal/types/invitation")
    autoload :InvitationNotFoundEncoded, ::File.join(__dir__, "peal/types/invitation_not_found_encoded")
    autoload :MeUserLocale, ::File.join(__dir__, "peal/types/me_user_locale")
    autoload :MeUser, ::File.join(__dir__, "peal/types/me_user")
    autoload :Membership, ::File.join(__dir__, "peal/types/membership")
    autoload :Me, ::File.join(__dir__, "peal/types/me")
    autoload :MediaDimensions, ::File.join(__dir__, "peal/types/media_dimensions")
    autoload :MediaKind, ::File.join(__dir__, "peal/types/media_kind")
    autoload :MediaStatusPending, ::File.join(__dir__, "peal/types/media_status_pending")
    autoload :MediaStatusReady, ::File.join(__dir__, "peal/types/media_status_ready")
    autoload :RejectionReason, ::File.join(__dir__, "peal/types/rejection_reason")
    autoload :MediaStatusRejected, ::File.join(__dir__, "peal/types/media_status_rejected")
    autoload :ProbeState, ::File.join(__dir__, "peal/types/probe_state")
    autoload :MediaStatusUploaded, ::File.join(__dir__, "peal/types/media_status_uploaded")
    autoload :MediaStatus, ::File.join(__dir__, "peal/types/media_status")
    autoload :Media, ::File.join(__dir__, "peal/types/media")
    autoload :MediaInUseEncodedTag, ::File.join(__dir__, "peal/types/media_in_use_encoded_tag")
    autoload :MediaInUseEncoded, ::File.join(__dir__, "peal/types/media_in_use_encoded")
    autoload :MediaNotFoundEncoded, ::File.join(__dir__, "peal/types/media_not_found_encoded")
    autoload :MediaPage, ::File.join(__dir__, "peal/types/media_page")
    autoload :MediaStoreUnavailableEncodedTag, ::File.join(__dir__, "peal/types/media_store_unavailable_encoded_tag")
    autoload :MediaStoreUnavailableEncoded, ::File.join(__dir__, "peal/types/media_store_unavailable_encoded")
    autoload :MediaUsage, ::File.join(__dir__, "peal/types/media_usage")
    autoload :MetricsSnapshot, ::File.join(__dir__, "peal/types/metrics_snapshot")
    autoload :Money, ::File.join(__dir__, "peal/types/money")
    autoload :NoticeChannel, ::File.join(__dir__, "peal/types/notice_channel")
    autoload :NoticeEventChannelReconnectRequired, ::File.join(__dir__, "peal/types/notice_event_channel_reconnect_required")
    autoload :NoticeEventChannelReconnectSoon, ::File.join(__dir__, "peal/types/notice_event_channel_reconnect_soon")
    autoload :NoticeEventPostFailed, ::File.join(__dir__, "peal/types/notice_event_post_failed")
    autoload :NoticeEventPostPublished, ::File.join(__dir__, "peal/types/notice_event_post_published")
    autoload :NoticeEventPostUnconfirmed, ::File.join(__dir__, "peal/types/notice_event_post_unconfirmed")
    autoload :NoticeEventSubscriptionCancelled, ::File.join(__dir__, "peal/types/notice_event_subscription_cancelled")
    autoload :NoticeEventSubscriptionRenewing, ::File.join(__dir__, "peal/types/notice_event_subscription_renewing")
    autoload :NoticeEventSubscriptionStarted, ::File.join(__dir__, "peal/types/notice_event_subscription_started")
    autoload :NoticeEventSubscriptionWithdrawn, ::File.join(__dir__, "peal/types/notice_event_subscription_withdrawn")
    autoload :NoticeEventTrialEnding, ::File.join(__dir__, "peal/types/notice_event_trial_ending")
    autoload :NoticeEvent, ::File.join(__dir__, "peal/types/notice_event")
    autoload :Notice, ::File.join(__dir__, "peal/types/notice")
    autoload :NoticePage, ::File.join(__dir__, "peal/types/notice_page")
    autoload :NotificationPreferencesEmail, ::File.join(__dir__, "peal/types/notification_preferences_email")
    autoload :NotificationPreferences, ::File.join(__dir__, "peal/types/notification_preferences")
    autoload :PlanLimit, ::File.join(__dir__, "peal/types/plan_limit")
    autoload :PlanLimitReachedEncodedTag, ::File.join(__dir__, "peal/types/plan_limit_reached_encoded_tag")
    autoload :PlanLimitReachedEncoded, ::File.join(__dir__, "peal/types/plan_limit_reached_encoded")
    autoload :PlatformUnreachableEncodedTag, ::File.join(__dir__, "peal/types/platform_unreachable_encoded_tag")
    autoload :PlatformUnreachableEncoded, ::File.join(__dir__, "peal/types/platform_unreachable_encoded")
    autoload :TargetMetrics, ::File.join(__dir__, "peal/types/target_metrics")
    autoload :PostAnalytics, ::File.join(__dir__, "peal/types/post_analytics")
    autoload :PostContentInvalidEncoded, ::File.join(__dir__, "peal/types/post_content_invalid_encoded")
    autoload :PostDraft, ::File.join(__dir__, "peal/types/post_draft")
    autoload :PostNotFoundEncoded, ::File.join(__dir__, "peal/types/post_not_found_encoded")
    autoload :PostStatusConflictEncodedTag, ::File.join(__dir__, "peal/types/post_status_conflict_encoded_tag")
    autoload :PostStatusConflictEncoded, ::File.join(__dir__, "peal/types/post_status_conflict_encoded")
    autoload :SignedRequestMethod, ::File.join(__dir__, "peal/types/signed_request_method")
    autoload :SignedRequest, ::File.join(__dir__, "peal/types/signed_request")
    autoload :UploadPart, ::File.join(__dir__, "peal/types/upload_part")
    autoload :UploadTargetMultipart, ::File.join(__dir__, "peal/types/upload_target_multipart")
    autoload :UploadTargetSingle, ::File.join(__dir__, "peal/types/upload_target_single")
    autoload :UploadTarget, ::File.join(__dir__, "peal/types/upload_target")
    autoload :PreparedUpload, ::File.join(__dir__, "peal/types/prepared_upload")
    autoload :PublicationAttempt, ::File.join(__dir__, "peal/types/publication_attempt")
    autoload :Role, ::File.join(__dir__, "peal/types/role")
    autoload :ScheduleInPastEncoded, ::File.join(__dir__, "peal/types/schedule_in_past_encoded")
    autoload :SuggestionHashtags, ::File.join(__dir__, "peal/types/suggestion_hashtags")
    autoload :SuggestionText, ::File.join(__dir__, "peal/types/suggestion_text")
    autoload :Suggestion, ::File.join(__dir__, "peal/types/suggestion")
    autoload :TargetConfirmationNotPublished, ::File.join(__dir__, "peal/types/target_confirmation_not_published")
    autoload :TargetConfirmationPublished, ::File.join(__dir__, "peal/types/target_confirmation_published")
    autoload :TargetConfirmation, ::File.join(__dir__, "peal/types/target_confirmation")
    autoload :TargetStatusConflictEncoded, ::File.join(__dir__, "peal/types/target_status_conflict_encoded")
    autoload :TikTokBlock, ::File.join(__dir__, "peal/types/tik_tok_block")
    autoload :TikTokAccountPostingBlocked, ::File.join(__dir__, "peal/types/tik_tok_account_posting_blocked")
    autoload :TikTokCreator, ::File.join(__dir__, "peal/types/tik_tok_creator")
    autoload :TikTokAccountPostingReady, ::File.join(__dir__, "peal/types/tik_tok_account_posting_ready")
    autoload :TikTokAccountPosting, ::File.join(__dir__, "peal/types/tik_tok_account_posting")
    autoload :TikTokAccount, ::File.join(__dir__, "peal/types/tik_tok_account")
    autoload :UnauthenticatedEncodedTag, ::File.join(__dir__, "peal/types/unauthenticated_encoded_tag")
    autoload :UnauthenticatedEncoded, ::File.join(__dir__, "peal/types/unauthenticated_encoded")
    autoload :UnknownChannelsEncoded, ::File.join(__dir__, "peal/types/unknown_channels_encoded")
    autoload :UnknownMediaEncoded, ::File.join(__dir__, "peal/types/unknown_media_encoded")
    autoload :UnreadNotices, ::File.join(__dir__, "peal/types/unread_notices")
    autoload :UploadIncompleteEncodedTag, ::File.join(__dir__, "peal/types/upload_incomplete_encoded_tag")
    autoload :UploadIncompleteEncoded, ::File.join(__dir__, "peal/types/upload_incomplete_encoded")
    autoload :UploadRejectedEncodedTag, ::File.join(__dir__, "peal/types/upload_rejected_encoded_tag")
    autoload :UploadRejectedEncoded, ::File.join(__dir__, "peal/types/upload_rejected_encoded")
    autoload :WorkspaceMember, ::File.join(__dir__, "peal/types/workspace_member")
    autoload :EffectHttpApiErrorBadRequestEncodedTag, ::File.join(__dir__, "peal/types/effect_http_api_error_bad_request_encoded_tag")
    autoload :EffectHttpApiErrorBadRequestEncoded, ::File.join(__dir__, "peal/types/effect_http_api_error_bad_request_encoded")
  end
end
