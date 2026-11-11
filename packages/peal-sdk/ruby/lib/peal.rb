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
require_relative "peal/channels/types/find_channels_request"
require_relative "peal/channels/types/platforms_channels_request"
require_relative "peal/channels/types/connect_channel"
require_relative "peal/channels/types/connect_callback"
require_relative "peal/channels/types/choose_accounts"
require_relative "peal/channels/types/reconnect_channels_request"
require_relative "peal/channels/types/disconnect_channels_request"
require_relative "peal/channels/types/channel_update"
require_relative "peal/channels/types/disable_channels_request"
require_relative "peal/channels/types/enable_channels_request"
require_relative "peal/posts/client"
require_relative "peal/posts/types/drafts_posts_request"
require_relative "peal/posts/types/list_posts_request"
require_relative "peal/posts/types/create_posts_request"
require_relative "peal/posts/types/search_posts_request"
require_relative "peal/posts/types/new_post"
require_relative "peal/posts/types/bulk_posts"
require_relative "peal/posts/types/post_import"
require_relative "peal/posts/types/post_to_validate"
require_relative "peal/posts/types/get_posts_request"
require_relative "peal/posts/types/update_posts_request"
require_relative "peal/posts/types/discard_posts_request"
require_relative "peal/posts/types/outcome_posts_request"
require_relative "peal/posts/types/attempts_posts_request"
require_relative "peal/posts/types/post_tags"
require_relative "peal/posts/types/duplicate_posts_request"
require_relative "peal/posts/types/schedule_post"
require_relative "peal/posts/types/reschedule_posts_request"
require_relative "peal/posts/types/unschedule_posts_request"
require_relative "peal/posts/types/repost_posts_request"
require_relative "peal/posts/types/confirm_posts_request"
require_relative "peal/posts/types/cancel_posts_request"
require_relative "peal/media/client"
require_relative "peal/media/types/list_media_request"
require_relative "peal/media/types/new_upload"
require_relative "peal/media/types/media_import"
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
require_relative "peal/billing/types/standing_billing_request"
require_relative "peal/analytics/client"
require_relative "peal/analytics/types/summary_analytics_request"
require_relative "peal/analytics/types/dashboard_analytics_request"
require_relative "peal/analytics/types/channel_analytics_request"
require_relative "peal/analytics/types/export_analytics_request"
require_relative "peal/analytics/types/post_analytics_request"
require_relative "peal/tiktok/client"
require_relative "peal/tiktok/types/creator_tiktok_request"
require_relative "peal/capabilities/client"
require_relative "peal/capabilities/types/platforms_capabilities_request"
require_relative "peal/capabilities/types/channel_capabilities_request"
require_relative "peal/lookups/client"
require_relative "peal/lookups/types/list_lookups_request"
require_relative "peal/lookups/types/lookup_input"
require_relative "peal/webhooks/client"
require_relative "peal/webhooks/types/list_webhooks_request"
require_relative "peal/webhooks/types/new_webhook_endpoint"
require_relative "peal/webhooks/types/search_deliveries_webhooks_request"
require_relative "peal/webhooks/types/redeliver_many_webhooks_request"
require_relative "peal/webhooks/types/get_webhooks_request"
require_relative "peal/webhooks/types/delete_webhooks_request"
require_relative "peal/webhooks/types/webhook_endpoint_change"
require_relative "peal/webhooks/types/rotate_secret_webhooks_request"
require_relative "peal/webhooks/types/send_test_webhooks_request"
require_relative "peal/webhooks/types/list_deliveries_webhooks_request"
require_relative "peal/webhooks/types/redeliver_webhooks_request"
require_relative "peal/inbox/client"
require_relative "peal/inbox/types/list_threads_inbox_request"
require_relative "peal/inbox/types/get_thread_inbox_request"
require_relative "peal/inbox/types/get_abilities_inbox_request"
require_relative "peal/inbox/types/new_inbox_reply"
require_relative "peal/inbox/types/set_answered_inbox_request"
require_relative "peal/inbox/types/moderate_inbox_request"
require_relative "peal/inbox/types/confirm_reply_inbox_request"
require_relative "peal/inbox/types/withdraw_reply_inbox_request"
require_relative "peal/ads/client"
require_relative "peal/ads/types/status_ads_request"
require_relative "peal/ads/types/list_connections_ads_request"
require_relative "peal/ads/types/connect_ads_request"
require_relative "peal/ads/types/ad_sign_in_callback"
require_relative "peal/ads/types/reachable_accounts_ads_request"
require_relative "peal/ads/types/ad_accounts_to_connect"
require_relative "peal/ads/types/disconnect_ads_request"
require_relative "peal/ads/types/list_accounts_ads_request"
require_relative "peal/ads/types/get_account_ads_request"
require_relative "peal/ads/types/remove_account_ads_request"
require_relative "peal/ads/types/ad_spending_decision"
require_relative "peal/ads/types/list_campaigns_ads_request"
require_relative "peal/ads/types/list_ads_ads_request"
require_relative "peal/ads/types/list_insights_ads_request"
require_relative "peal/ads/types/post_performance_ads_request"
require_relative "peal/ads/types/quote_boost_ads_request"
require_relative "peal/ads/types/list_boosts_ads_request"
require_relative "peal/ads/types/create_boost_ads_request"
require_relative "peal/ads/types/get_boost_ads_request"
require_relative "peal/ads/types/pause_boost_ads_request"
require_relative "peal/ads/types/resume_boost_ads_request"
require_relative "peal/ads/types/stop_boost_ads_request"
require_relative "peal/ads/types/audit_trail_ads_request"
require_relative "peal/activity/client"
require_relative "peal/activity/types/list_activity_request"
require_relative "peal/partner/client"
require_relative "peal/partner/types/list_workspaces_partner_request"
require_relative "peal/partner/types/new_customer_workspace"
require_relative "peal/partner/types/get_workspace_partner_request"
require_relative "peal/partner/types/delete_workspace_partner_request"
require_relative "peal/partner/types/customer_workspace_change"
require_relative "peal/partner_account/client"
require_relative "peal/partner_account/types/get_partner_account_request"
require_relative "peal/partner_account/types/open_partner"
require_relative "peal/partner_account/types/close_partner_account_request"
require_relative "peal/partner_account/types/partner_change"
require_relative "peal/partner_account/types/list_keys_partner_account_request"
require_relative "peal/partner_account/types/new_partner_key"
require_relative "peal/partner_account/types/revoke_key_partner_account_request"
require_relative "peal/partner_account/types/list_workspaces_partner_account_request"
require_relative "peal/connect_links/client"
require_relative "peal/connect_links/types/list_connect_links_request"
require_relative "peal/connect_links/types/new_connect_link"
require_relative "peal/connect_links/types/get_connect_links_request"
require_relative "peal/connect_links/types/revoke_connect_links_request"
require_relative "peal/review/client"
require_relative "peal/review/types/settings_review_request"
require_relative "peal/review/types/update_settings_review_request"
require_relative "peal/review/types/pending_review_request"
require_relative "peal/review/types/thread_review_request"
require_relative "peal/review/types/new_comment"
require_relative "peal/review/types/resolve_review_request"
require_relative "peal/review/types/approval_decision"
require_relative "peal/review/types/changes_request"
require_relative "peal/review/types/links_review_request"
require_relative "peal/review/types/new_review_link"
require_relative "peal/review/types/revoke_link_review_request"
require_relative "peal/tags/client"
require_relative "peal/tags/types/list_tags_request"
require_relative "peal/tags/types/create_tags_request"
require_relative "peal/tags/types/delete_tags_request"
require_relative "peal/tags/types/update_tags_request"
require_relative "peal/signatures/client"
require_relative "peal/signatures/types/list_signatures_request"
require_relative "peal/signatures/types/create_signatures_request"
require_relative "peal/signatures/types/update_signatures_request"
require_relative "peal/signatures/types/delete_signatures_request"
require_relative "peal/channel_sets/client"
require_relative "peal/channel_sets/types/list_channel_sets_request"
require_relative "peal/channel_sets/types/create_channel_sets_request"
require_relative "peal/channel_sets/types/update_channel_sets_request"
require_relative "peal/channel_sets/types/delete_channel_sets_request"
require_relative "peal/channel_defaults/client"
require_relative "peal/channel_defaults/types/get_channel_defaults_request"
require_relative "peal/channel_defaults/types/new_channel_defaults"
require_relative "peal/channel_defaults/types/clear_channel_defaults_request"
require_relative "peal/environment"

module Peal
  module NotificationPreferences
    module Types
      autoload :NotificationPreferencesChangeEmail, ::File.join(__dir__, "peal/notification_preferences/types/notification_preferences_change_email")
    end
  end

  module Inbox
    module Types
      autoload :ListThreadsInboxRequestUnanswered, ::File.join(__dir__, "peal/inbox/types/list_threads_inbox_request_unanswered")
    end
  end

  module Review
    module Types
      autoload :NewCommentAnchorSelection, ::File.join(__dir__, "peal/review/types/new_comment_anchor_selection")
      autoload :NewCommentAnchor, ::File.join(__dir__, "peal/review/types/new_comment_anchor")
    end
  end

  module Types
    autoload :ChannelNotFoundEncoded, ::File.join(__dir__, "peal/types/channel_not_found_encoded")
    autoload :WorkspaceNotFoundEncodedTag, ::File.join(__dir__, "peal/types/workspace_not_found_encoded_tag")
    autoload :WorkspaceNotFoundEncoded, ::File.join(__dir__, "peal/types/workspace_not_found_encoded")
    autoload :NotFoundErrorBody, ::File.join(__dir__, "peal/types/not_found_error_body")
    autoload :Platform, ::File.join(__dir__, "peal/types/platform")
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
    autoload :ContentViolationTooManyParts, ::File.join(__dir__, "peal/types/content_violation_too_many_parts")
    autoload :ContentViolationTooManyPixels, ::File.join(__dir__, "peal/types/content_violation_too_many_pixels")
    autoload :ContentViolationTooManyVideos, ::File.join(__dir__, "peal/types/content_violation_too_many_videos")
    autoload :ContentViolationVideoTooLong, ::File.join(__dir__, "peal/types/content_violation_video_too_long")
    autoload :ContentViolationVideoTooShort, ::File.join(__dir__, "peal/types/content_violation_video_too_short")
    autoload :ContentViolation, ::File.join(__dir__, "peal/types/content_violation")
    autoload :PostContentInvalidEncodedTag, ::File.join(__dir__, "peal/types/post_content_invalid_encoded_tag")
    autoload :PostContentInvalidEncoded, ::File.join(__dir__, "peal/types/post_content_invalid_encoded")
    autoload :UnknownChannelsEncodedTag, ::File.join(__dir__, "peal/types/unknown_channels_encoded_tag")
    autoload :UnknownChannelsEncoded, ::File.join(__dir__, "peal/types/unknown_channels_encoded")
    autoload :UnprocessableEntityErrorBody, ::File.join(__dir__, "peal/types/unprocessable_entity_error_body")
    autoload :InvalidTimeRangeEncodedTag, ::File.join(__dir__, "peal/types/invalid_time_range_encoded_tag")
    autoload :InvalidTimeRangeEncoded, ::File.join(__dir__, "peal/types/invalid_time_range_encoded")
    autoload :EffectHttpApiErrorBadRequestEncodedTag, ::File.join(__dir__, "peal/types/effect_http_api_error_bad_request_encoded_tag")
    autoload :EffectHttpApiErrorBadRequestEncoded, ::File.join(__dir__, "peal/types/effect_http_api_error_bad_request_encoded")
    autoload :BadRequestErrorBody, ::File.join(__dir__, "peal/types/bad_request_error_body")
    autoload :ChannelSetNameTakenEncodedTag, ::File.join(__dir__, "peal/types/channel_set_name_taken_encoded_tag")
    autoload :ChannelSetNameTakenEncoded, ::File.join(__dir__, "peal/types/channel_set_name_taken_encoded")
    autoload :TooManyChannelSetsEncoded, ::File.join(__dir__, "peal/types/too_many_channel_sets_encoded")
    autoload :ConflictErrorBody, ::File.join(__dir__, "peal/types/conflict_error_body")
    autoload :TooManyConnectLinksEncoded, ::File.join(__dir__, "peal/types/too_many_connect_links_encoded")
    autoload :TooManyRequestsEncodedTag, ::File.join(__dir__, "peal/types/too_many_requests_encoded_tag")
    autoload :TooManyRequestsEncoded, ::File.join(__dir__, "peal/types/too_many_requests_encoded")
    autoload :TooManyRequestsErrorBody, ::File.join(__dir__, "peal/types/too_many_requests_error_body")
    autoload :BillingUnavailableEncoded, ::File.join(__dir__, "peal/types/billing_unavailable_encoded")
    autoload :MediaStoreUnavailableEncodedTag, ::File.join(__dir__, "peal/types/media_store_unavailable_encoded_tag")
    autoload :MediaStoreUnavailableEncoded, ::File.join(__dir__, "peal/types/media_store_unavailable_encoded")
    autoload :ServiceUnavailableErrorBody, ::File.join(__dir__, "peal/types/service_unavailable_error_body")
    autoload :ForbiddenEncodedTag, ::File.join(__dir__, "peal/types/forbidden_encoded_tag")
    autoload :ForbiddenReason, ::File.join(__dir__, "peal/types/forbidden_reason")
    autoload :Permission, ::File.join(__dir__, "peal/types/permission")
    autoload :ForbiddenEncoded, ::File.join(__dir__, "peal/types/forbidden_encoded")
    autoload :PartnerAccountsClosedEncoded, ::File.join(__dir__, "peal/types/partner_accounts_closed_encoded")
    autoload :ForbiddenErrorBody, ::File.join(__dir__, "peal/types/forbidden_error_body")
    autoload :AccountRestrictionMediaTypesRefused, ::File.join(__dir__, "peal/types/account_restriction_media_types_refused")
    autoload :AccountRestrictionOptionFixed, ::File.join(__dir__, "peal/types/account_restriction_option_fixed")
    autoload :AccountRestrictionOptionValues, ::File.join(__dir__, "peal/types/account_restriction_option_values")
    autoload :AccountRestrictionVideoDuration, ::File.join(__dir__, "peal/types/account_restriction_video_duration")
    autoload :AccountRestriction, ::File.join(__dir__, "peal/types/account_restriction")
    autoload :TikTokBlock, ::File.join(__dir__, "peal/types/tik_tok_block")
    autoload :AccountStandingRead, ::File.join(__dir__, "peal/types/account_standing_read")
    autoload :AccountUnreadReason, ::File.join(__dir__, "peal/types/account_unread_reason")
    autoload :AccountStandingUnread, ::File.join(__dir__, "peal/types/account_standing_unread")
    autoload :AccountStandingUnrestricted, ::File.join(__dir__, "peal/types/account_standing_unrestricted")
    autoload :AccountStanding, ::File.join(__dir__, "peal/types/account_standing")
    autoload :ActivityActorAPIKey, ::File.join(__dir__, "peal/types/activity_actor_api_key")
    autoload :ActivityActorUser, ::File.join(__dir__, "peal/types/activity_actor_user")
    autoload :ActivityActor, ::File.join(__dir__, "peal/types/activity_actor")
    autoload :ActivityApplication, ::File.join(__dir__, "peal/types/activity_application")
    autoload :ActivityVia, ::File.join(__dir__, "peal/types/activity_via")
    autoload :ActivityEvent, ::File.join(__dir__, "peal/types/activity_event")
    autoload :ActivityPage, ::File.join(__dir__, "peal/types/activity_page")
    autoload :AdObjectStatus, ::File.join(__dir__, "peal/types/ad_object_status")
    autoload :PaidTotals, ::File.join(__dir__, "peal/types/paid_totals")
    autoload :Ad, ::File.join(__dir__, "peal/types/ad")
    autoload :AdAccess, ::File.join(__dir__, "peal/types/ad_access")
    autoload :AdAccountStatus, ::File.join(__dir__, "peal/types/ad_account_status")
    autoload :AdNetwork, ::File.join(__dir__, "peal/types/ad_network")
    autoload :AdAccount, ::File.join(__dir__, "peal/types/ad_account")
    autoload :AdAccountBusyEncodedTag, ::File.join(__dir__, "peal/types/ad_account_busy_encoded_tag")
    autoload :AdAccountBusyEncoded, ::File.join(__dir__, "peal/types/ad_account_busy_encoded")
    autoload :AdAccountNotFoundEncoded, ::File.join(__dir__, "peal/types/ad_account_not_found_encoded")
    autoload :AdAccountSpendCapExceededEncoded, ::File.join(__dir__, "peal/types/ad_account_spend_cap_exceeded_encoded")
    autoload :AdAccountUnsupported, ::File.join(__dir__, "peal/types/ad_account_unsupported")
    autoload :AdAccountUnusableEncodedReason, ::File.join(__dir__, "peal/types/ad_account_unusable_encoded_reason")
    autoload :AdAccountUnusableEncoded, ::File.join(__dir__, "peal/types/ad_account_unusable_encoded")
    autoload :AdAuditAction, ::File.join(__dir__, "peal/types/ad_audit_action")
    autoload :AdAuditEntryByKind, ::File.join(__dir__, "peal/types/ad_audit_entry_by_kind")
    autoload :AdAuditEntryBy, ::File.join(__dir__, "peal/types/ad_audit_entry_by")
    autoload :AdAuditEntry, ::File.join(__dir__, "peal/types/ad_audit_entry")
    autoload :AdAuditPage, ::File.join(__dir__, "peal/types/ad_audit_page")
    autoload :CampaignObjective, ::File.join(__dir__, "peal/types/campaign_objective")
    autoload :AdCampaign, ::File.join(__dir__, "peal/types/ad_campaign")
    autoload :CalendarDay, ::File.join(__dir__, "peal/types/calendar_day")
    autoload :AdCampaignReport, ::File.join(__dir__, "peal/types/ad_campaign_report")
    autoload :AdConnection, ::File.join(__dir__, "peal/types/ad_connection")
    autoload :AdConnectionNotFoundEncoded, ::File.join(__dir__, "peal/types/ad_connection_not_found_encoded")
    autoload :AdInsightDay, ::File.join(__dir__, "peal/types/ad_insight_day")
    autoload :AdInsightReport, ::File.join(__dir__, "peal/types/ad_insight_report")
    autoload :AdMoney, ::File.join(__dir__, "peal/types/ad_money")
    autoload :AdNetworkUnavailableEncodedTag, ::File.join(__dir__, "peal/types/ad_network_unavailable_encoded_tag")
    autoload :AdNetworkUnavailableEncoded, ::File.join(__dir__, "peal/types/ad_network_unavailable_encoded")
    autoload :AdReport, ::File.join(__dir__, "peal/types/ad_report")
    autoload :AdSignIn, ::File.join(__dir__, "peal/types/ad_sign_in")
    autoload :AdSignInFailedEncodedTag, ::File.join(__dir__, "peal/types/ad_sign_in_failed_encoded_tag")
    autoload :AdSignInFailedEncodedReason, ::File.join(__dir__, "peal/types/ad_sign_in_failed_encoded_reason")
    autoload :AdSignInFailedEncoded, ::File.join(__dir__, "peal/types/ad_sign_in_failed_encoded")
    autoload :ReachableAdAccount, ::File.join(__dir__, "peal/types/reachable_ad_account")
    autoload :AdSignInResult, ::File.join(__dir__, "peal/types/ad_sign_in_result")
    autoload :AdSpending, ::File.join(__dir__, "peal/types/ad_spending")
    autoload :AdSpendingNotEnabledEncoded, ::File.join(__dir__, "peal/types/ad_spending_not_enabled_encoded")
    autoload :AdSpendingUnavailableEncoded, ::File.join(__dir__, "peal/types/ad_spending_unavailable_encoded")
    autoload :AdsMode, ::File.join(__dir__, "peal/types/ads_mode")
    autoload :AdsStatus, ::File.join(__dir__, "peal/types/ads_status")
    autoload :AdsUnavailableEncoded, ::File.join(__dir__, "peal/types/ads_unavailable_encoded")
    autoload :AlreadyMemberEncoded, ::File.join(__dir__, "peal/types/already_member_encoded")
    autoload :AltTextTooLongEncodedTag, ::File.join(__dir__, "peal/types/alt_text_too_long_encoded_tag")
    autoload :AltTextTooLongEncoded, ::File.join(__dir__, "peal/types/alt_text_too_long_encoded")
    autoload :AnalyticsDashboardPrevious, ::File.join(__dir__, "peal/types/analytics_dashboard_previous")
    autoload :DashboardTotals, ::File.join(__dir__, "peal/types/dashboard_totals")
    autoload :FollowerChange, ::File.join(__dir__, "peal/types/follower_change")
    autoload :ChannelDashboard, ::File.join(__dir__, "peal/types/channel_dashboard")
    autoload :DashboardDay, ::File.join(__dir__, "peal/types/dashboard_day")
    autoload :PlatformDashboard, ::File.join(__dir__, "peal/types/platform_dashboard")
    autoload :PostMetrics, ::File.join(__dir__, "peal/types/post_metrics")
    autoload :TopPost, ::File.join(__dir__, "peal/types/top_post")
    autoload :AnalyticsDashboard, ::File.join(__dir__, "peal/types/analytics_dashboard")
    autoload :AnalyticsExportFormat, ::File.join(__dir__, "peal/types/analytics_export_format")
    autoload :AnalyticsExportKind, ::File.join(__dir__, "peal/types/analytics_export_kind")
    autoload :ChannelMetrics, ::File.join(__dir__, "peal/types/channel_metrics")
    autoload :EngagementDay, ::File.join(__dir__, "peal/types/engagement_day")
    autoload :MetricTotals, ::File.join(__dir__, "peal/types/metric_totals")
    autoload :AnalyticsSummary, ::File.join(__dir__, "peal/types/analytics_summary")
    autoload :BreakingChange, ::File.join(__dir__, "peal/types/breaking_change")
    autoload :APIChangelogEntry, ::File.join(__dir__, "peal/types/api_changelog_entry")
    autoload :APIChangelog, ::File.join(__dir__, "peal/types/api_changelog")
    autoload :APIKey, ::File.join(__dir__, "peal/types/api_key")
    autoload :APIKeyNotFoundEncoded, ::File.join(__dir__, "peal/types/api_key_not_found_encoded")
    autoload :ApprovalChangedEncoded, ::File.join(__dir__, "peal/types/approval_changed_encoded")
    autoload :ApprovalNotPendingEncoded, ::File.join(__dir__, "peal/types/approval_not_pending_encoded")
    autoload :ApprovalOrigin, ::File.join(__dir__, "peal/types/approval_origin")
    autoload :ReviewerKind, ::File.join(__dir__, "peal/types/reviewer_kind")
    autoload :Reviewer, ::File.join(__dir__, "peal/types/reviewer")
    autoload :ApprovalRequestDecision, ::File.join(__dir__, "peal/types/approval_request_decision")
    autoload :ApprovalStatus, ::File.join(__dir__, "peal/types/approval_status")
    autoload :PostSchedule, ::File.join(__dir__, "peal/types/post_schedule")
    autoload :ApprovalRequest, ::File.join(__dir__, "peal/types/approval_request")
    autoload :ApprovalOutcome, ::File.join(__dir__, "peal/types/approval_outcome")
    autoload :ApprovalPolicy, ::File.join(__dir__, "peal/types/approval_policy")
    autoload :AssistantActionHashtags, ::File.join(__dir__, "peal/types/assistant_action_hashtags")
    autoload :AssistantTone, ::File.join(__dir__, "peal/types/assistant_tone")
    autoload :AssistantActionRewrite, ::File.join(__dir__, "peal/types/assistant_action_rewrite")
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
    autoload :PaidPlan, ::File.join(__dir__, "peal/types/paid_plan")
    autoload :Plan, ::File.join(__dir__, "peal/types/plan")
    autoload :AssistantQuotaExceededEncoded, ::File.join(__dir__, "peal/types/assistant_quota_exceeded_encoded")
    autoload :AssistantStatus, ::File.join(__dir__, "peal/types/assistant_status")
    autoload :AssistantUnavailableEncodedTag, ::File.join(__dir__, "peal/types/assistant_unavailable_encoded_tag")
    autoload :AssistantUnavailableEncoded, ::File.join(__dir__, "peal/types/assistant_unavailable_encoded")
    autoload :AttemptResult, ::File.join(__dir__, "peal/types/attempt_result")
    autoload :Authorization, ::File.join(__dir__, "peal/types/authorization")
    autoload :BillingInterval, ::File.join(__dir__, "peal/types/billing_interval")
    autoload :SubscriptionStatus, ::File.join(__dir__, "peal/types/subscription_status")
    autoload :BillingSubscription, ::File.join(__dir__, "peal/types/billing_subscription")
    autoload :PeriodUsage, ::File.join(__dir__, "peal/types/period_usage")
    autoload :PlanAllowances, ::File.join(__dir__, "peal/types/plan_allowances")
    autoload :PlanPrice, ::File.join(__dir__, "peal/types/plan_price")
    autoload :PlanOffer, ::File.join(__dir__, "peal/types/plan_offer")
    autoload :TrialOffer, ::File.join(__dir__, "peal/types/trial_offer")
    autoload :Usage, ::File.join(__dir__, "peal/types/usage")
    autoload :Billing, ::File.join(__dir__, "peal/types/billing")
    autoload :BoostObjective, ::File.join(__dir__, "peal/types/boost_objective")
    autoload :BoostPlatform, ::File.join(__dir__, "peal/types/boost_platform")
    autoload :BoostAudience, ::File.join(__dir__, "peal/types/boost_audience")
    autoload :BoostBudgetKind, ::File.join(__dir__, "peal/types/boost_budget_kind")
    autoload :BoostBudget, ::File.join(__dir__, "peal/types/boost_budget")
    autoload :BoostFailureReason, ::File.join(__dir__, "peal/types/boost_failure_reason")
    autoload :BoostState, ::File.join(__dir__, "peal/types/boost_state")
    autoload :Boost, ::File.join(__dir__, "peal/types/boost")
    autoload :BoostStepStep, ::File.join(__dir__, "peal/types/boost_step_step")
    autoload :BoostStepOutcome, ::File.join(__dir__, "peal/types/boost_step_outcome")
    autoload :BoostStep, ::File.join(__dir__, "peal/types/boost_step")
    autoload :BoostDetail, ::File.join(__dir__, "peal/types/boost_detail")
    autoload :BoostViolation, ::File.join(__dir__, "peal/types/boost_violation")
    autoload :BoostInvalidEncoded, ::File.join(__dir__, "peal/types/boost_invalid_encoded")
    autoload :BoostKeyReusedEncoded, ::File.join(__dir__, "peal/types/boost_key_reused_encoded")
    autoload :BoostNotFoundEncoded, ::File.join(__dir__, "peal/types/boost_not_found_encoded")
    autoload :BoostPage, ::File.join(__dir__, "peal/types/boost_page")
    autoload :BoostQuote, ::File.join(__dir__, "peal/types/boost_quote")
    autoload :BoostStateConflictEncoded, ::File.join(__dir__, "peal/types/boost_state_conflict_encoded")
    autoload :GoogleBusinessCallToAction, ::File.join(__dir__, "peal/types/google_business_call_to_action")
    autoload :GoogleBusinessPostType, ::File.join(__dir__, "peal/types/google_business_post_type")
    autoload :GoogleBusinessOptions, ::File.join(__dir__, "peal/types/google_business_options")
    autoload :LinkedInMention, ::File.join(__dir__, "peal/types/linked_in_mention")
    autoload :LinkedInVisibility, ::File.join(__dir__, "peal/types/linked_in_visibility")
    autoload :LinkedInOptions, ::File.join(__dir__, "peal/types/linked_in_options")
    autoload :PinterestOptions, ::File.join(__dir__, "peal/types/pinterest_options")
    autoload :TikTokPrivacyLevel, ::File.join(__dir__, "peal/types/tik_tok_privacy_level")
    autoload :TikTokOptions, ::File.join(__dir__, "peal/types/tik_tok_options")
    autoload :YouTubePrivacy, ::File.join(__dir__, "peal/types/you_tube_privacy")
    autoload :YouTubeOptions, ::File.join(__dir__, "peal/types/you_tube_options")
    autoload :TargetOptions, ::File.join(__dir__, "peal/types/target_options")
    autoload :ChannelOptions, ::File.join(__dir__, "peal/types/channel_options")
    autoload :MediaAttachment, ::File.join(__dir__, "peal/types/media_attachment")
    autoload :TextOverride, ::File.join(__dir__, "peal/types/text_override")
    autoload :PostPart, ::File.join(__dir__, "peal/types/post_part")
    autoload :PostContent, ::File.join(__dir__, "peal/types/post_content")
    autoload :PostTimingAt, ::File.join(__dir__, "peal/types/post_timing_at")
    autoload :PostTimingNow, ::File.join(__dir__, "peal/types/post_timing_now")
    autoload :PostTiming, ::File.join(__dir__, "peal/types/post_timing")
    autoload :BulkPost, ::File.join(__dir__, "peal/types/bulk_post")
    autoload :FailureReason, ::File.join(__dir__, "peal/types/failure_reason")
    autoload :LivePart, ::File.join(__dir__, "peal/types/live_part")
    autoload :PostOriginVia, ::File.join(__dir__, "peal/types/post_origin_via")
    autoload :PostOrigin, ::File.join(__dir__, "peal/types/post_origin")
    autoload :PostOutcome, ::File.join(__dir__, "peal/types/post_outcome")
    autoload :PostStatus, ::File.join(__dir__, "peal/types/post_status")
    autoload :PostTargetStatus, ::File.join(__dir__, "peal/types/post_target_status")
    autoload :TargetParts, ::File.join(__dir__, "peal/types/target_parts")
    autoload :UnconfirmedReason, ::File.join(__dir__, "peal/types/unconfirmed_reason")
    autoload :PostTarget, ::File.join(__dir__, "peal/types/post_target")
    autoload :PostWarningChannelsDropped, ::File.join(__dir__, "peal/types/post_warning_channels_dropped")
    autoload :PostWarning, ::File.join(__dir__, "peal/types/post_warning")
    autoload :Post, ::File.join(__dir__, "peal/types/post")
    autoload :BulkPostResultCreated, ::File.join(__dir__, "peal/types/bulk_post_result_created")
    autoload :ChannelSetNotFoundEncoded, ::File.join(__dir__, "peal/types/channel_set_not_found_encoded")
    autoload :DuplicateOnChannel, ::File.join(__dir__, "peal/types/duplicate_on_channel")
    autoload :DuplicatePostEncoded, ::File.join(__dir__, "peal/types/duplicate_post_encoded")
    autoload :IdempotencyKeyReusedEncoded, ::File.join(__dir__, "peal/types/idempotency_key_reused_encoded")
    autoload :InvalidTimeZoneEncodedTag, ::File.join(__dir__, "peal/types/invalid_time_zone_encoded_tag")
    autoload :InvalidTimeZoneEncoded, ::File.join(__dir__, "peal/types/invalid_time_zone_encoded")
    autoload :PlanLimit, ::File.join(__dir__, "peal/types/plan_limit")
    autoload :PlanLimitReachedEncodedTag, ::File.join(__dir__, "peal/types/plan_limit_reached_encoded_tag")
    autoload :PlanLimitReachedEncoded, ::File.join(__dir__, "peal/types/plan_limit_reached_encoded")
    autoload :PostNotFoundEncoded, ::File.join(__dir__, "peal/types/post_not_found_encoded")
    autoload :ScheduleInPastEncoded, ::File.join(__dir__, "peal/types/schedule_in_past_encoded")
    autoload :SignatureNotFoundEncoded, ::File.join(__dir__, "peal/types/signature_not_found_encoded")
    autoload :UnknownMediaEncoded, ::File.join(__dir__, "peal/types/unknown_media_encoded")
    autoload :UnknownTagsEncodedTag, ::File.join(__dir__, "peal/types/unknown_tags_encoded_tag")
    autoload :UnknownTagsEncoded, ::File.join(__dir__, "peal/types/unknown_tags_encoded")
    autoload :PostRefusal, ::File.join(__dir__, "peal/types/post_refusal")
    autoload :BulkPostResultRefused, ::File.join(__dir__, "peal/types/bulk_post_result_refused")
    autoload :BulkPostResult, ::File.join(__dir__, "peal/types/bulk_post_result")
    autoload :BulkResult, ::File.join(__dir__, "peal/types/bulk_result")
    autoload :CeilingCurrencyMismatchEncodedTag, ::File.join(__dir__, "peal/types/ceiling_currency_mismatch_encoded_tag")
    autoload :CeilingCurrencyMismatchEncoded, ::File.join(__dir__, "peal/types/ceiling_currency_mismatch_encoded")
    autoload :CommentSelectionLocated, ::File.join(__dir__, "peal/types/comment_selection_located")
    autoload :CommentSelection, ::File.join(__dir__, "peal/types/comment_selection")
    autoload :CommentAnchor, ::File.join(__dir__, "peal/types/comment_anchor")
    autoload :ReviewCommentResolved, ::File.join(__dir__, "peal/types/review_comment_resolved")
    autoload :ReviewComment, ::File.join(__dir__, "peal/types/review_comment")
    autoload :ChangesOutcome, ::File.join(__dir__, "peal/types/changes_outcome")
    autoload :ChannelConnection, ::File.join(__dir__, "peal/types/channel_connection")
    autoload :ChannelStatusActive, ::File.join(__dir__, "peal/types/channel_status_active")
    autoload :ChannelStatusDisabled, ::File.join(__dir__, "peal/types/channel_status_disabled")
    autoload :ChannelStatusRefreshNeeded, ::File.join(__dir__, "peal/types/channel_status_refresh_needed")
    autoload :ChannelStatus, ::File.join(__dir__, "peal/types/channel_status")
    autoload :Channel, ::File.join(__dir__, "peal/types/channel")
    autoload :ChannelCannotPostEncodedTag, ::File.join(__dir__, "peal/types/channel_cannot_post_encoded_tag")
    autoload :ChannelCannotPostEncodedReason, ::File.join(__dir__, "peal/types/channel_cannot_post_encoded_reason")
    autoload :ChannelCannotPostEncoded, ::File.join(__dir__, "peal/types/channel_cannot_post_encoded")
    autoload :FieldDefault, ::File.join(__dir__, "peal/types/field_default")
    autoload :FieldType, ::File.join(__dir__, "peal/types/field_type")
    autoload :LookupName, ::File.join(__dir__, "peal/types/lookup_name")
    autoload :FieldDescription, ::File.join(__dir__, "peal/types/field_description")
    autoload :FollowUpCapabilitiesKind, ::File.join(__dir__, "peal/types/follow_up_capabilities_kind")
    autoload :FollowUpCapabilities, ::File.join(__dir__, "peal/types/follow_up_capabilities")
    autoload :LookupDescription, ::File.join(__dir__, "peal/types/lookup_description")
    autoload :MediaCapabilitiesAltText, ::File.join(__dir__, "peal/types/media_capabilities_alt_text")
    autoload :MediaKind, ::File.join(__dir__, "peal/types/media_kind")
    autoload :MediaFormat, ::File.join(__dir__, "peal/types/media_format")
    autoload :MediaCapabilities, ::File.join(__dir__, "peal/types/media_capabilities")
    autoload :OptionConstraintNeededWith, ::File.join(__dir__, "peal/types/option_constraint_needed_with")
    autoload :OptionConstraintNeedsOneOf, ::File.join(__dir__, "peal/types/option_constraint_needs_one_of")
    autoload :OptionConstraintNotWith, ::File.join(__dir__, "peal/types/option_constraint_not_with")
    autoload :OptionConstraintOnlyWith, ::File.join(__dir__, "peal/types/option_constraint_only_with")
    autoload :OptionConstraint, ::File.join(__dir__, "peal/types/option_constraint")
    autoload :PlatformCapabilitiesAnalyticsAccountNumbersItem, ::File.join(__dir__, "peal/types/platform_capabilities_analytics_account_numbers_item")
    autoload :PlatformCapabilitiesAnalyticsPostCountsItem, ::File.join(__dir__, "peal/types/platform_capabilities_analytics_post_counts_item")
    autoload :PlatformCapabilitiesAnalytics, ::File.join(__dir__, "peal/types/platform_capabilities_analytics")
    autoload :PlatformCapabilitiesOptions, ::File.join(__dir__, "peal/types/platform_capabilities_options")
    autoload :TextLimit, ::File.join(__dir__, "peal/types/text_limit")
    autoload :TextCapabilities, ::File.join(__dir__, "peal/types/text_capabilities")
    autoload :PlatformCapabilities, ::File.join(__dir__, "peal/types/platform_capabilities")
    autoload :ChannelCapabilities, ::File.join(__dir__, "peal/types/channel_capabilities")
    autoload :ChannelDay, ::File.join(__dir__, "peal/types/channel_day")
    autoload :ChannelDefaults, ::File.join(__dir__, "peal/types/channel_defaults")
    autoload :ChannelPageCounts, ::File.join(__dir__, "peal/types/channel_page_counts")
    autoload :ChannelPage, ::File.join(__dir__, "peal/types/channel_page")
    autoload :LimitedCount, ::File.join(__dir__, "peal/types/limited_count")
    autoload :TextCount, ::File.join(__dir__, "peal/types/text_count")
    autoload :PartPreview, ::File.join(__dir__, "peal/types/part_preview")
    autoload :ChannelPreview, ::File.join(__dir__, "peal/types/channel_preview")
    autoload :ChannelSeries, ::File.join(__dir__, "peal/types/channel_series")
    autoload :ChannelSet, ::File.join(__dir__, "peal/types/channel_set")
    autoload :ChannelSetDetails, ::File.join(__dir__, "peal/types/channel_set_details")
    autoload :ChannelStatusName, ::File.join(__dir__, "peal/types/channel_status_name")
    autoload :ChoosableAccount, ::File.join(__dir__, "peal/types/choosable_account")
    autoload :CommentInvalidEncodedTag, ::File.join(__dir__, "peal/types/comment_invalid_encoded_tag")
    autoload :CommentProblem, ::File.join(__dir__, "peal/types/comment_problem")
    autoload :CommentInvalidEncoded, ::File.join(__dir__, "peal/types/comment_invalid_encoded")
    autoload :CommentNotFoundEncoded, ::File.join(__dir__, "peal/types/comment_not_found_encoded")
    autoload :ConnectFailedEncodedTag, ::File.join(__dir__, "peal/types/connect_failed_encoded_tag")
    autoload :ConnectFailureReason, ::File.join(__dir__, "peal/types/connect_failure_reason")
    autoload :ConnectFailedEncoded, ::File.join(__dir__, "peal/types/connect_failed_encoded")
    autoload :ConnectLinkStatus, ::File.join(__dir__, "peal/types/connect_link_status")
    autoload :HostedConnectFailure, ::File.join(__dir__, "peal/types/hosted_connect_failure")
    autoload :ConnectLink, ::File.join(__dir__, "peal/types/connect_link")
    autoload :ConnectLinkLocale, ::File.join(__dir__, "peal/types/connect_link_locale")
    autoload :ConnectLinkNotFoundEncoded, ::File.join(__dir__, "peal/types/connect_link_not_found_encoded")
    autoload :ConnectOutcomeChoose, ::File.join(__dir__, "peal/types/connect_outcome_choose")
    autoload :ConnectOutcomeConnected, ::File.join(__dir__, "peal/types/connect_outcome_connected")
    autoload :ConnectOutcome, ::File.join(__dir__, "peal/types/connect_outcome")
    autoload :InstagramConnection, ::File.join(__dir__, "peal/types/instagram_connection")
    autoload :LinkedInConnection, ::File.join(__dir__, "peal/types/linked_in_connection")
    autoload :ConnectablePlatforms, ::File.join(__dir__, "peal/types/connectable_platforms")
    autoload :CreatedAPIKey, ::File.join(__dir__, "peal/types/created_api_key")
    autoload :CreatedConnectLink, ::File.join(__dir__, "peal/types/created_connect_link")
    autoload :PartnerScope, ::File.join(__dir__, "peal/types/partner_scope")
    autoload :PartnerKey, ::File.join(__dir__, "peal/types/partner_key")
    autoload :CreatedPartnerKey, ::File.join(__dir__, "peal/types/created_partner_key")
    autoload :ReviewLinkAccess, ::File.join(__dir__, "peal/types/review_link_access")
    autoload :ReviewLinkStatus, ::File.join(__dir__, "peal/types/review_link_status")
    autoload :ReviewLink, ::File.join(__dir__, "peal/types/review_link")
    autoload :CreatedReviewLink, ::File.join(__dir__, "peal/types/created_review_link")
    autoload :CustomerWorkspace, ::File.join(__dir__, "peal/types/customer_workspace")
    autoload :CustomerWorkspacePage, ::File.join(__dir__, "peal/types/customer_workspace_page")
    autoload :DatabaseUnavailableEncodedTag, ::File.join(__dir__, "peal/types/database_unavailable_encoded_tag")
    autoload :DatabaseUnavailableEncoded, ::File.join(__dir__, "peal/types/database_unavailable_encoded")
    autoload :DeletionIncompleteEncodedTag, ::File.join(__dir__, "peal/types/deletion_incomplete_encoded_tag")
    autoload :DeletionIncompleteEncoded, ::File.join(__dir__, "peal/types/deletion_incomplete_encoded")
    autoload :DraftPage, ::File.join(__dir__, "peal/types/draft_page")
    autoload :HeldLimit, ::File.join(__dir__, "peal/types/held_limit")
    autoload :Excess, ::File.join(__dir__, "peal/types/excess")
    autoload :ExternalIDTakenEncodedTag, ::File.join(__dir__, "peal/types/external_id_taken_encoded_tag")
    autoload :ExternalIDTakenEncoded, ::File.join(__dir__, "peal/types/external_id_taken_encoded")
    autoload :ImportCellProblemProblem, ::File.join(__dir__, "peal/types/import_cell_problem_problem")
    autoload :ImportColumn, ::File.join(__dir__, "peal/types/import_column")
    autoload :ImportCellProblem, ::File.join(__dir__, "peal/types/import_cell_problem")
    autoload :ImportProblem, ::File.join(__dir__, "peal/types/import_problem")
    autoload :ImportRowResultCreated, ::File.join(__dir__, "peal/types/import_row_result_created")
    autoload :ImportRowResultRefused, ::File.join(__dir__, "peal/types/import_row_result_refused")
    autoload :ImportRowResultUnreadableCells, ::File.join(__dir__, "peal/types/import_row_result_unreadable_cells")
    autoload :ImportRowResultUnreadable, ::File.join(__dir__, "peal/types/import_row_result_unreadable")
    autoload :ImportRowResultValid, ::File.join(__dir__, "peal/types/import_row_result_valid")
    autoload :ImportRowResult, ::File.join(__dir__, "peal/types/import_row_result")
    autoload :ImportResult, ::File.join(__dir__, "peal/types/import_result")
    autoload :ImportUnreadableEncodedTag, ::File.join(__dir__, "peal/types/import_unreadable_encoded_tag")
    autoload :ImportUnreadableEncoded, ::File.join(__dir__, "peal/types/import_unreadable_encoded")
    autoload :InboxAbilityStanding, ::File.join(__dir__, "peal/types/inbox_ability_standing")
    autoload :InboxAbilities, ::File.join(__dir__, "peal/types/inbox_abilities")
    autoload :InboxActionFailedEncodedTag, ::File.join(__dir__, "peal/types/inbox_action_failed_encoded_tag")
    autoload :InboxActionFailedEncoded, ::File.join(__dir__, "peal/types/inbox_action_failed_encoded")
    autoload :InboxActionUnavailableEncodedStanding, ::File.join(__dir__, "peal/types/inbox_action_unavailable_encoded_standing")
    autoload :InboxActionUnavailableEncoded, ::File.join(__dir__, "peal/types/inbox_action_unavailable_encoded")
    autoload :InboxAuthor, ::File.join(__dir__, "peal/types/inbox_author")
    autoload :InboxCollectionEnd, ::File.join(__dir__, "peal/types/inbox_collection_end")
    autoload :InboxCommentState, ::File.join(__dir__, "peal/types/inbox_comment_state")
    autoload :InboxComment, ::File.join(__dir__, "peal/types/inbox_comment")
    autoload :InboxCommentGoneEncodedTag, ::File.join(__dir__, "peal/types/inbox_comment_gone_encoded_tag")
    autoload :InboxCommentGoneEncoded, ::File.join(__dir__, "peal/types/inbox_comment_gone_encoded")
    autoload :InboxCommentNotFoundEncoded, ::File.join(__dir__, "peal/types/inbox_comment_not_found_encoded")
    autoload :InboxModerationAction, ::File.join(__dir__, "peal/types/inbox_moderation_action")
    autoload :InboxReplyReason, ::File.join(__dir__, "peal/types/inbox_reply_reason")
    autoload :InboxReplyStatus, ::File.join(__dir__, "peal/types/inbox_reply_status")
    autoload :InboxReply, ::File.join(__dir__, "peal/types/inbox_reply")
    autoload :InboxReplyNotFoundEncoded, ::File.join(__dir__, "peal/types/inbox_reply_not_found_encoded")
    autoload :InboxThread, ::File.join(__dir__, "peal/types/inbox_thread")
    autoload :InboxThreadDetail, ::File.join(__dir__, "peal/types/inbox_thread_detail")
    autoload :InboxThreadNotFoundEncoded, ::File.join(__dir__, "peal/types/inbox_thread_not_found_encoded")
    autoload :InboxThreadPage, ::File.join(__dir__, "peal/types/inbox_thread_page")
    autoload :InvalidDateRangeEncodedTag, ::File.join(__dir__, "peal/types/invalid_date_range_encoded_tag")
    autoload :InvalidDateRangeEncoded, ::File.join(__dir__, "peal/types/invalid_date_range_encoded")
    autoload :Invitation, ::File.join(__dir__, "peal/types/invitation")
    autoload :InvitationNotFoundEncoded, ::File.join(__dir__, "peal/types/invitation_not_found_encoded")
    autoload :LinkedInOrganization, ::File.join(__dir__, "peal/types/linked_in_organization")
    autoload :LookupInputInvalidEncodedTag, ::File.join(__dir__, "peal/types/lookup_input_invalid_encoded_tag")
    autoload :LookupInputInvalidEncoded, ::File.join(__dir__, "peal/types/lookup_input_invalid_encoded")
    autoload :LookupNotFoundEncoded, ::File.join(__dir__, "peal/types/lookup_not_found_encoded")
    autoload :LookupResultLinkedinOrganizations, ::File.join(__dir__, "peal/types/lookup_result_linkedin_organizations")
    autoload :PinterestBoardSection, ::File.join(__dir__, "peal/types/pinterest_board_section")
    autoload :LookupResultPinterestBoardSections, ::File.join(__dir__, "peal/types/lookup_result_pinterest_board_sections")
    autoload :PinterestBoard, ::File.join(__dir__, "peal/types/pinterest_board")
    autoload :LookupResultPinterestBoards, ::File.join(__dir__, "peal/types/lookup_result_pinterest_boards")
    autoload :TikTokAccountPostingBlocked, ::File.join(__dir__, "peal/types/tik_tok_account_posting_blocked")
    autoload :TikTokCreator, ::File.join(__dir__, "peal/types/tik_tok_creator")
    autoload :TikTokAccountPostingReady, ::File.join(__dir__, "peal/types/tik_tok_account_posting_ready")
    autoload :TikTokAccountPosting, ::File.join(__dir__, "peal/types/tik_tok_account_posting")
    autoload :TikTokAccount, ::File.join(__dir__, "peal/types/tik_tok_account")
    autoload :LookupResultTiktokCreator, ::File.join(__dir__, "peal/types/lookup_result_tiktok_creator")
    autoload :YouTubePlaylist, ::File.join(__dir__, "peal/types/you_tube_playlist")
    autoload :LookupResultYoutubePlaylists, ::File.join(__dir__, "peal/types/lookup_result_youtube_playlists")
    autoload :YouTubeVideoCategory, ::File.join(__dir__, "peal/types/you_tube_video_category")
    autoload :LookupResultYoutubeVideoCategories, ::File.join(__dir__, "peal/types/lookup_result_youtube_video_categories")
    autoload :LookupResult, ::File.join(__dir__, "peal/types/lookup_result")
    autoload :MeUserLocale, ::File.join(__dir__, "peal/types/me_user_locale")
    autoload :MeUser, ::File.join(__dir__, "peal/types/me_user")
    autoload :Membership, ::File.join(__dir__, "peal/types/membership")
    autoload :Me, ::File.join(__dir__, "peal/types/me")
    autoload :MediaDimensions, ::File.join(__dir__, "peal/types/media_dimensions")
    autoload :MediaStatusPending, ::File.join(__dir__, "peal/types/media_status_pending")
    autoload :MediaStatusReady, ::File.join(__dir__, "peal/types/media_status_ready")
    autoload :RejectionReason, ::File.join(__dir__, "peal/types/rejection_reason")
    autoload :MediaStatusRejected, ::File.join(__dir__, "peal/types/media_status_rejected")
    autoload :ProbeState, ::File.join(__dir__, "peal/types/probe_state")
    autoload :MediaStatusUploaded, ::File.join(__dir__, "peal/types/media_status_uploaded")
    autoload :MediaStatus, ::File.join(__dir__, "peal/types/media_status")
    autoload :Media, ::File.join(__dir__, "peal/types/media")
    autoload :MediaImportBusyEncoded, ::File.join(__dir__, "peal/types/media_import_busy_encoded")
    autoload :MediaInUseEncodedTag, ::File.join(__dir__, "peal/types/media_in_use_encoded_tag")
    autoload :MediaInUseEncoded, ::File.join(__dir__, "peal/types/media_in_use_encoded")
    autoload :MediaNotFoundEncoded, ::File.join(__dir__, "peal/types/media_not_found_encoded")
    autoload :MediaPage, ::File.join(__dir__, "peal/types/media_page")
    autoload :MediaSourceFailure, ::File.join(__dir__, "peal/types/media_source_failure")
    autoload :MediaSourceNotPublicEncoded, ::File.join(__dir__, "peal/types/media_source_not_public_encoded")
    autoload :MediaSourceUnreachableEncoded, ::File.join(__dir__, "peal/types/media_source_unreachable_encoded")
    autoload :MediaTooLargeEncodedKind, ::File.join(__dir__, "peal/types/media_too_large_encoded_kind")
    autoload :MediaTooLargeEncoded, ::File.join(__dir__, "peal/types/media_too_large_encoded")
    autoload :MediaUsage, ::File.join(__dir__, "peal/types/media_usage")
    autoload :MetricsSnapshot, ::File.join(__dir__, "peal/types/metrics_snapshot")
    autoload :Money, ::File.join(__dir__, "peal/types/money")
    autoload :SpecialAdCategory, ::File.join(__dir__, "peal/types/special_ad_category")
    autoload :NewBoost, ::File.join(__dir__, "peal/types/new_boost")
    autoload :NoticeChannel, ::File.join(__dir__, "peal/types/notice_channel")
    autoload :NoticeEventAdBoostChangedChange, ::File.join(__dir__, "peal/types/notice_event_ad_boost_changed_change")
    autoload :NoticeEventAdBoostChanged, ::File.join(__dir__, "peal/types/notice_event_ad_boost_changed")
    autoload :NoticeEventAdConnectionReconnectRequired, ::File.join(__dir__, "peal/types/notice_event_ad_connection_reconnect_required")
    autoload :NoticeEventChannelReconnectRequired, ::File.join(__dir__, "peal/types/notice_event_channel_reconnect_required")
    autoload :NoticeEventChannelReconnectSoon, ::File.join(__dir__, "peal/types/notice_event_channel_reconnect_soon")
    autoload :NoticeEventCommentsReceived, ::File.join(__dir__, "peal/types/notice_event_comments_received")
    autoload :NoticeEventPostApprovalRequested, ::File.join(__dir__, "peal/types/notice_event_post_approval_requested")
    autoload :ReviewParty, ::File.join(__dir__, "peal/types/review_party")
    autoload :NoticeEventPostApproved, ::File.join(__dir__, "peal/types/notice_event_post_approved")
    autoload :NoticeEventPostChangesRequested, ::File.join(__dir__, "peal/types/notice_event_post_changes_requested")
    autoload :NoticeEventPostCommented, ::File.join(__dir__, "peal/types/notice_event_post_commented")
    autoload :NoticeEventPostFailed, ::File.join(__dir__, "peal/types/notice_event_post_failed")
    autoload :NoticeEventPostPublished, ::File.join(__dir__, "peal/types/notice_event_post_published")
    autoload :NoticeEventPostUnconfirmed, ::File.join(__dir__, "peal/types/notice_event_post_unconfirmed")
    autoload :NoticeEventSubscriptionCancelled, ::File.join(__dir__, "peal/types/notice_event_subscription_cancelled")
    autoload :NoticeEventSubscriptionRenewing, ::File.join(__dir__, "peal/types/notice_event_subscription_renewing")
    autoload :NoticeEventSubscriptionStarted, ::File.join(__dir__, "peal/types/notice_event_subscription_started")
    autoload :NoticeEventSubscriptionWithdrawn, ::File.join(__dir__, "peal/types/notice_event_subscription_withdrawn")
    autoload :NoticeEventTrialEnding, ::File.join(__dir__, "peal/types/notice_event_trial_ending")
    autoload :WebhookTurnOffReason, ::File.join(__dir__, "peal/types/webhook_turn_off_reason")
    autoload :NoticeEventWebhookEndpointDisabled, ::File.join(__dir__, "peal/types/notice_event_webhook_endpoint_disabled")
    autoload :NoticeEvent, ::File.join(__dir__, "peal/types/notice_event")
    autoload :Notice, ::File.join(__dir__, "peal/types/notice")
    autoload :NoticePage, ::File.join(__dir__, "peal/types/notice_page")
    autoload :NotificationPreferencesEmail, ::File.join(__dir__, "peal/types/notification_preferences_email")
    autoload :NotificationPreferences, ::File.join(__dir__, "peal/types/notification_preferences")
    autoload :OrganicCounts, ::File.join(__dir__, "peal/types/organic_counts")
    autoload :Partner, ::File.join(__dir__, "peal/types/partner")
    autoload :PartnerDetailField, ::File.join(__dir__, "peal/types/partner_detail_field")
    autoload :PartnerDetailsInvalidEncodedTag, ::File.join(__dir__, "peal/types/partner_details_invalid_encoded_tag")
    autoload :PartnerDetailsInvalidEncoded, ::File.join(__dir__, "peal/types/partner_details_invalid_encoded")
    autoload :PartnerKeyNotFoundEncoded, ::File.join(__dir__, "peal/types/partner_key_not_found_encoded")
    autoload :PartnerNotFoundEncoded, ::File.join(__dir__, "peal/types/partner_not_found_encoded")
    autoload :PartnerUsageDay, ::File.join(__dir__, "peal/types/partner_usage_day")
    autoload :PartnerUsage, ::File.join(__dir__, "peal/types/partner_usage")
    autoload :PartnerOverview, ::File.join(__dir__, "peal/types/partner_overview")
    autoload :PartnerOwnsWorkspacesEncodedTag, ::File.join(__dir__, "peal/types/partner_owns_workspaces_encoded_tag")
    autoload :PartnerOwnsWorkspacesEncoded, ::File.join(__dir__, "peal/types/partner_owns_workspaces_encoded")
    autoload :PartnerStanding, ::File.join(__dir__, "peal/types/partner_standing")
    autoload :PlanShortfall, ::File.join(__dir__, "peal/types/plan_shortfall")
    autoload :PlatformRateLimitedEncoded, ::File.join(__dir__, "peal/types/platform_rate_limited_encoded")
    autoload :PlatformUnreachableEncodedTag, ::File.join(__dir__, "peal/types/platform_unreachable_encoded_tag")
    autoload :PlatformUnreachableEncoded, ::File.join(__dir__, "peal/types/platform_unreachable_encoded")
    autoload :PostAdPerformancePaidItem, ::File.join(__dir__, "peal/types/post_ad_performance_paid_item")
    autoload :PostAdPerformance, ::File.join(__dir__, "peal/types/post_ad_performance")
    autoload :TargetMetrics, ::File.join(__dir__, "peal/types/target_metrics")
    autoload :PostAnalytics, ::File.join(__dir__, "peal/types/post_analytics")
    autoload :PostChannel, ::File.join(__dir__, "peal/types/post_channel")
    autoload :PostDraft, ::File.join(__dir__, "peal/types/post_draft")
    autoload :PostNotPromotableEncodedReason, ::File.join(__dir__, "peal/types/post_not_promotable_encoded_reason")
    autoload :PostNotPromotableEncoded, ::File.join(__dir__, "peal/types/post_not_promotable_encoded")
    autoload :PostNotReviewableEncodedStatus, ::File.join(__dir__, "peal/types/post_not_reviewable_encoded_status")
    autoload :PostNotReviewableEncoded, ::File.join(__dir__, "peal/types/post_not_reviewable_encoded")
    autoload :PostPage, ::File.join(__dir__, "peal/types/post_page")
    autoload :ReviewedMedia, ::File.join(__dir__, "peal/types/reviewed_media")
    autoload :ReviewedPart, ::File.join(__dir__, "peal/types/reviewed_part")
    autoload :ReviewedChannel, ::File.join(__dir__, "peal/types/reviewed_channel")
    autoload :PostReview, ::File.join(__dir__, "peal/types/post_review")
    autoload :PostSort, ::File.join(__dir__, "peal/types/post_sort")
    autoload :PostStatusConflictEncodedTag, ::File.join(__dir__, "peal/types/post_status_conflict_encoded_tag")
    autoload :PostStatusConflictEncoded, ::File.join(__dir__, "peal/types/post_status_conflict_encoded")
    autoload :ScheduleCheck, ::File.join(__dir__, "peal/types/schedule_check")
    autoload :PostValidation, ::File.join(__dir__, "peal/types/post_validation")
    autoload :SignedRequestMethod, ::File.join(__dir__, "peal/types/signed_request_method")
    autoload :SignedRequest, ::File.join(__dir__, "peal/types/signed_request")
    autoload :UploadPart, ::File.join(__dir__, "peal/types/upload_part")
    autoload :UploadTargetMultipart, ::File.join(__dir__, "peal/types/upload_target_multipart")
    autoload :UploadTargetSingle, ::File.join(__dir__, "peal/types/upload_target_single")
    autoload :UploadTarget, ::File.join(__dir__, "peal/types/upload_target")
    autoload :PreparedUpload, ::File.join(__dir__, "peal/types/prepared_upload")
    autoload :PublicationAttempt, ::File.join(__dir__, "peal/types/publication_attempt")
    autoload :ReplyInvalidEncodedTag, ::File.join(__dir__, "peal/types/reply_invalid_encoded_tag")
    autoload :ReplyInvalidEncodedReason, ::File.join(__dir__, "peal/types/reply_invalid_encoded_reason")
    autoload :ReplyInvalidEncoded, ::File.join(__dir__, "peal/types/reply_invalid_encoded")
    autoload :ReplyPendingEncoded, ::File.join(__dir__, "peal/types/reply_pending_encoded")
    autoload :ReplyStatusConflictEncodedTag, ::File.join(__dir__, "peal/types/reply_status_conflict_encoded_tag")
    autoload :ReplyStatusConflictEncoded, ::File.join(__dir__, "peal/types/reply_status_conflict_encoded")
    autoload :ReturnURLNotAllowedEncoded, ::File.join(__dir__, "peal/types/return_url_not_allowed_encoded")
    autoload :ReviewLinkNotFoundEncoded, ::File.join(__dir__, "peal/types/review_link_not_found_encoded")
    autoload :ReviewSettings, ::File.join(__dir__, "peal/types/review_settings")
    autoload :Role, ::File.join(__dir__, "peal/types/role")
    autoload :SignatureScopeChannel, ::File.join(__dir__, "peal/types/signature_scope_channel")
    autoload :SignatureScopePlatform, ::File.join(__dir__, "peal/types/signature_scope_platform")
    autoload :SignatureScopeWorkspace, ::File.join(__dir__, "peal/types/signature_scope_workspace")
    autoload :SignatureScope, ::File.join(__dir__, "peal/types/signature_scope")
    autoload :Signature, ::File.join(__dir__, "peal/types/signature")
    autoload :SignatureDetails, ::File.join(__dir__, "peal/types/signature_details")
    autoload :SignatureNameTakenEncodedTag, ::File.join(__dir__, "peal/types/signature_name_taken_encoded_tag")
    autoload :SignatureNameTakenEncoded, ::File.join(__dir__, "peal/types/signature_name_taken_encoded")
    autoload :SpendCeilingExceededEncoded, ::File.join(__dir__, "peal/types/spend_ceiling_exceeded_encoded")
    autoload :Standing, ::File.join(__dir__, "peal/types/standing")
    autoload :SubscribableWebhookEventType, ::File.join(__dir__, "peal/types/subscribable_webhook_event_type")
    autoload :SuggestionHashtags, ::File.join(__dir__, "peal/types/suggestion_hashtags")
    autoload :SuggestionText, ::File.join(__dir__, "peal/types/suggestion_text")
    autoload :Suggestion, ::File.join(__dir__, "peal/types/suggestion")
    autoload :TagColour, ::File.join(__dir__, "peal/types/tag_colour")
    autoload :Tag, ::File.join(__dir__, "peal/types/tag")
    autoload :TagDetails, ::File.join(__dir__, "peal/types/tag_details")
    autoload :TagNameTakenEncodedTag, ::File.join(__dir__, "peal/types/tag_name_taken_encoded_tag")
    autoload :TagNameTakenEncoded, ::File.join(__dir__, "peal/types/tag_name_taken_encoded")
    autoload :TagNotFoundEncoded, ::File.join(__dir__, "peal/types/tag_not_found_encoded")
    autoload :TargetConfirmationNotPublished, ::File.join(__dir__, "peal/types/target_confirmation_not_published")
    autoload :TargetConfirmationPublished, ::File.join(__dir__, "peal/types/target_confirmation_published")
    autoload :TargetConfirmation, ::File.join(__dir__, "peal/types/target_confirmation")
    autoload :TargetStatusConflictEncoded, ::File.join(__dir__, "peal/types/target_status_conflict_encoded")
    autoload :TooManyInvitationsEncoded, ::File.join(__dir__, "peal/types/too_many_invitations_encoded")
    autoload :TooManyReviewLinksEncoded, ::File.join(__dir__, "peal/types/too_many_review_links_encoded")
    autoload :TooManySignaturesEncoded, ::File.join(__dir__, "peal/types/too_many_signatures_encoded")
    autoload :TooManyTagsEncoded, ::File.join(__dir__, "peal/types/too_many_tags_encoded")
    autoload :TooManyWebhookEndpointsEncodedTag, ::File.join(__dir__, "peal/types/too_many_webhook_endpoints_encoded_tag")
    autoload :TooManyWebhookEndpointsEncoded, ::File.join(__dir__, "peal/types/too_many_webhook_endpoints_encoded")
    autoload :TooManyWebhookSendsEncoded, ::File.join(__dir__, "peal/types/too_many_webhook_sends_encoded")
    autoload :UnauthenticatedEncodedTag, ::File.join(__dir__, "peal/types/unauthenticated_encoded_tag")
    autoload :UnauthenticatedEncoded, ::File.join(__dir__, "peal/types/unauthenticated_encoded")
    autoload :UnreadNotices, ::File.join(__dir__, "peal/types/unread_notices")
    autoload :UnsupportedMediaTypeEncoded, ::File.join(__dir__, "peal/types/unsupported_media_type_encoded")
    autoload :UploadIncompleteEncodedTag, ::File.join(__dir__, "peal/types/upload_incomplete_encoded_tag")
    autoload :UploadIncompleteEncoded, ::File.join(__dir__, "peal/types/upload_incomplete_encoded")
    autoload :UploadRejectedEncodedTag, ::File.join(__dir__, "peal/types/upload_rejected_encoded_tag")
    autoload :UploadRejectedEncoded, ::File.join(__dir__, "peal/types/upload_rejected_encoded")
    autoload :WebhookAttemptError, ::File.join(__dir__, "peal/types/webhook_attempt_error")
    autoload :WebhookDeliveryFailure, ::File.join(__dir__, "peal/types/webhook_delivery_failure")
    autoload :WebhookDeliveryStatus, ::File.join(__dir__, "peal/types/webhook_delivery_status")
    autoload :WebhookEventType, ::File.join(__dir__, "peal/types/webhook_event_type")
    autoload :WebhookDelivery, ::File.join(__dir__, "peal/types/webhook_delivery")
    autoload :WebhookRedeliverySkip, ::File.join(__dir__, "peal/types/webhook_redelivery_skip")
    autoload :WebhookRedeliverySkipped, ::File.join(__dir__, "peal/types/webhook_redelivery_skipped")
    autoload :WebhookBulkRedelivery, ::File.join(__dir__, "peal/types/webhook_bulk_redelivery")
    autoload :WebhookDeliveryNotFoundEncoded, ::File.join(__dir__, "peal/types/webhook_delivery_not_found_encoded")
    autoload :WebhookDeliveryPage, ::File.join(__dir__, "peal/types/webhook_delivery_page")
    autoload :WebhookDisabledReason, ::File.join(__dir__, "peal/types/webhook_disabled_reason")
    autoload :WebhookEndpointScope, ::File.join(__dir__, "peal/types/webhook_endpoint_scope")
    autoload :WebhookEndpoint, ::File.join(__dir__, "peal/types/webhook_endpoint")
    autoload :WebhookEndpointDisabledEncodedTag, ::File.join(__dir__, "peal/types/webhook_endpoint_disabled_encoded_tag")
    autoload :WebhookEndpointDisabledEncoded, ::File.join(__dir__, "peal/types/webhook_endpoint_disabled_encoded")
    autoload :WebhookEndpointNotFoundEncoded, ::File.join(__dir__, "peal/types/webhook_endpoint_not_found_encoded")
    autoload :WebhookEndpointSecret, ::File.join(__dir__, "peal/types/webhook_endpoint_secret")
    autoload :WebhookFilterRefusedEncodedField, ::File.join(__dir__, "peal/types/webhook_filter_refused_encoded_field")
    autoload :WebhookFilterRefusedEncoded, ::File.join(__dir__, "peal/types/webhook_filter_refused_encoded")
    autoload :WebhookRedeliveryByIDs, ::File.join(__dir__, "peal/types/webhook_redelivery_by_ids")
    autoload :WebhookRedeliveryOfFailed, ::File.join(__dir__, "peal/types/webhook_redelivery_of_failed")
    autoload :WebhookRedeliveryRequest, ::File.join(__dir__, "peal/types/webhook_redelivery_request")
    autoload :WebhookURLRefusal, ::File.join(__dir__, "peal/types/webhook_url_refusal")
    autoload :WebhookURLRefusedEncoded, ::File.join(__dir__, "peal/types/webhook_url_refused_encoded")
    autoload :WebhooksNotConfiguredEncodedTag, ::File.join(__dir__, "peal/types/webhooks_not_configured_encoded_tag")
    autoload :WebhooksNotConfiguredEncoded, ::File.join(__dir__, "peal/types/webhooks_not_configured_encoded")
    autoload :WorkspaceBusyEncodedTag, ::File.join(__dir__, "peal/types/workspace_busy_encoded_tag")
    autoload :WorkspaceBusyEncoded, ::File.join(__dir__, "peal/types/workspace_busy_encoded")
    autoload :WorkspaceMember, ::File.join(__dir__, "peal/types/workspace_member")
  end
end
