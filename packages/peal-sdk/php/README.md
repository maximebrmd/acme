# OpenAPIClient-php

Schedule posts across social platforms, follow how they did, and manage a Peal workspace's channels, media and members.

For more information, please visit [https://peal.social](https://peal.social).

## Installation & Usage

### Requirements

PHP 8.1 and later.

### Composer

To install the bindings via [Composer](https://getcomposer.org/), add the following to `composer.json`:

```json
{
  "repositories": [
    {
      "type": "vcs",
      "url": "https://github.com/peal-social/peal.git"
    }
  ],
  "require": {
    "peal-social/peal": "*@dev"
  }
}
```

Then run `composer install`

### Manual Installation

Download the files and include `autoload.php`:

```php
<?php
require_once('/path/to/OpenAPIClient-php/vendor/autoload.php');
```

## Getting Started

Please follow the [installation procedure](#installation--usage) and then run the following:

```php
<?php
require_once(__DIR__ . '/vendor/autoload.php');



// Configure Bearer authorization: bearer
$config = Peal\Configuration::getDefaultConfiguration()->setAccessToken('YOUR_ACCESS_TOKEN');


$apiInstance = new Peal\Api\AnalyticsApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$workspace_id = 'workspace_id_example'; // string
$post_id = 'post_id_example'; // string

try {
    $result = $apiInstance->analyticsPost($workspace_id, $post_id);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling AnalyticsApi->analyticsPost: ', $e->getMessage(), PHP_EOL;
}

```

## API Endpoints

All URIs are relative to *https://app.peal.social*

Class | Method | HTTP request | Description
------------ | ------------- | ------------- | -------------
*AnalyticsApi* | [**analyticsPost**](docs/Api/AnalyticsApi.md#analyticspost) | **GET** /api/workspaces/{workspaceId}/analytics/posts/{postId} | Get a post&#39;s analytics
*AnalyticsApi* | [**analyticsSummary**](docs/Api/AnalyticsApi.md#analyticssummary) | **GET** /api/workspaces/{workspaceId}/analytics/summary | Summarize the workspace&#39;s analytics
*ApiKeysApi* | [**apiKeysCreate**](docs/Api/ApiKeysApi.md#apikeyscreate) | **POST** /api/workspaces/{workspaceId}/api-keys | Create an API key
*ApiKeysApi* | [**apiKeysList**](docs/Api/ApiKeysApi.md#apikeyslist) | **GET** /api/workspaces/{workspaceId}/api-keys | List API keys
*ApiKeysApi* | [**apiKeysRevoke**](docs/Api/ApiKeysApi.md#apikeysrevoke) | **DELETE** /api/workspaces/{workspaceId}/api-keys/{apiKeyId} | Revoke an API key
*AssistantApi* | [**assistantStatus**](docs/Api/AssistantApi.md#assistantstatus) | **GET** /api/workspaces/{workspaceId}/assistant | Get the assistant&#39;s status
*AssistantApi* | [**assistantSuggest**](docs/Api/AssistantApi.md#assistantsuggest) | **POST** /api/workspaces/{workspaceId}/assistant/suggestions | Suggest a change to a post&#39;s text
*BillingApi* | [**billingGet**](docs/Api/BillingApi.md#billingget) | **GET** /api/workspaces/{workspaceId}/billing | Get the workspace&#39;s billing
*ChannelsApi* | [**channelsChooseAccounts**](docs/Api/ChannelsApi.md#channelschooseaccounts) | **POST** /api/workspaces/{workspaceId}/channels/connect/{platform}/accounts | Choose the accounts to connect
*ChannelsApi* | [**channelsCompleteConnect**](docs/Api/ChannelsApi.md#channelscompleteconnect) | **POST** /api/workspaces/{workspaceId}/channels/connect/{platform}/callback | Complete connecting an account
*ChannelsApi* | [**channelsConnect**](docs/Api/ChannelsApi.md#channelsconnect) | **POST** /api/workspaces/{workspaceId}/channels/connect/{platform} | Start connecting an account
*ChannelsApi* | [**channelsDisconnect**](docs/Api/ChannelsApi.md#channelsdisconnect) | **DELETE** /api/workspaces/{workspaceId}/channels/{channelId} | Disconnect a channel
*ChannelsApi* | [**channelsList**](docs/Api/ChannelsApi.md#channelslist) | **GET** /api/workspaces/{workspaceId}/channels | List channels
*ChannelsApi* | [**channelsPlatforms**](docs/Api/ChannelsApi.md#channelsplatforms) | **GET** /api/workspaces/{workspaceId}/channels/platforms | List connectable platforms
*ChannelsApi* | [**channelsReconnect**](docs/Api/ChannelsApi.md#channelsreconnect) | **POST** /api/workspaces/{workspaceId}/channels/{channelId}/reconnect | Start reconnecting a channel
*InvitationsApi* | [**invitationsCreate**](docs/Api/InvitationsApi.md#invitationscreate) | **POST** /api/workspaces/{workspaceId}/invitations | Invite someone
*InvitationsApi* | [**invitationsList**](docs/Api/InvitationsApi.md#invitationslist) | **GET** /api/workspaces/{workspaceId}/invitations | List invitations
*InvitationsApi* | [**invitationsRevoke**](docs/Api/InvitationsApi.md#invitationsrevoke) | **DELETE** /api/workspaces/{workspaceId}/invitations/{invitationId} | Revoke an invitation
*MediaApi* | [**mediaComplete**](docs/Api/MediaApi.md#mediacomplete) | **POST** /api/workspaces/{workspaceId}/media/{mediaId}/complete | Complete an upload
*MediaApi* | [**mediaCreate**](docs/Api/MediaApi.md#mediacreate) | **POST** /api/workspaces/{workspaceId}/media | Start an upload
*MediaApi* | [**mediaDelete**](docs/Api/MediaApi.md#mediadelete) | **DELETE** /api/workspaces/{workspaceId}/media/{mediaId} | Delete media
*MediaApi* | [**mediaDescribe**](docs/Api/MediaApi.md#mediadescribe) | **PATCH** /api/workspaces/{workspaceId}/media/{mediaId} | Describe media
*MediaApi* | [**mediaGet**](docs/Api/MediaApi.md#mediaget) | **GET** /api/workspaces/{workspaceId}/media/{mediaId} | Get media
*MediaApi* | [**mediaList**](docs/Api/MediaApi.md#medialist) | **GET** /api/workspaces/{workspaceId}/media | List media
*MediaApi* | [**mediaUsage**](docs/Api/MediaApi.md#mediausage) | **GET** /api/workspaces/{workspaceId}/media/{mediaId}/usage | Get where media is used
*MembersApi* | [**membersList**](docs/Api/MembersApi.md#memberslist) | **GET** /api/workspaces/{workspaceId}/members | List members
*NoticesApi* | [**noticesList**](docs/Api/NoticesApi.md#noticeslist) | **GET** /api/me/notices | List notices
*NoticesApi* | [**noticesMarkAllRead**](docs/Api/NoticesApi.md#noticesmarkallread) | **POST** /api/me/notices/read-all | Mark all notices read
*NoticesApi* | [**noticesMarkRead**](docs/Api/NoticesApi.md#noticesmarkread) | **POST** /api/me/notices/read | Mark notices read
*NoticesApi* | [**noticesUnread**](docs/Api/NoticesApi.md#noticesunread) | **GET** /api/me/notices/unread | Count unread notices
*NotificationPreferencesApi* | [**notificationPreferencesGet**](docs/Api/NotificationPreferencesApi.md#notificationpreferencesget) | **GET** /api/me/notification-preferences | Get notification preferences
*NotificationPreferencesApi* | [**notificationPreferencesUpdate**](docs/Api/NotificationPreferencesApi.md#notificationpreferencesupdate) | **PATCH** /api/me/notification-preferences | Change notification preferences
*PostsApi* | [**postsAttempts**](docs/Api/PostsApi.md#postsattempts) | **GET** /api/workspaces/{workspaceId}/posts/{postId}/attempts | List a post&#39;s attempts
*PostsApi* | [**postsCancel**](docs/Api/PostsApi.md#postscancel) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/cancel | Cancel a post
*PostsApi* | [**postsConfirm**](docs/Api/PostsApi.md#postsconfirm) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/targets/{targetId}/confirm | Confirm a post on a channel
*PostsApi* | [**postsCreate**](docs/Api/PostsApi.md#postscreate) | **POST** /api/workspaces/{workspaceId}/posts | Create a draft
*PostsApi* | [**postsDiscard**](docs/Api/PostsApi.md#postsdiscard) | **DELETE** /api/workspaces/{workspaceId}/posts/{postId} | Discard a draft
*PostsApi* | [**postsDrafts**](docs/Api/PostsApi.md#postsdrafts) | **GET** /api/workspaces/{workspaceId}/posts/drafts | List drafts
*PostsApi* | [**postsGet**](docs/Api/PostsApi.md#postsget) | **GET** /api/workspaces/{workspaceId}/posts/{postId} | Get a post
*PostsApi* | [**postsList**](docs/Api/PostsApi.md#postslist) | **GET** /api/workspaces/{workspaceId}/posts | List scheduled posts
*PostsApi* | [**postsRepost**](docs/Api/PostsApi.md#postsrepost) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/targets/{targetId}/repost | Repost on a channel
*PostsApi* | [**postsReschedule**](docs/Api/PostsApi.md#postsreschedule) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/reschedule | Reschedule a post
*PostsApi* | [**postsSchedule**](docs/Api/PostsApi.md#postsschedule) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/schedule | Schedule a draft
*PostsApi* | [**postsUnschedule**](docs/Api/PostsApi.md#postsunschedule) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/unschedule | Unschedule a post
*PostsApi* | [**postsUpdate**](docs/Api/PostsApi.md#postsupdate) | **PUT** /api/workspaces/{workspaceId}/posts/{postId} | Update a draft
*SessionApi* | [**sessionMe**](docs/Api/SessionApi.md#sessionme) | **GET** /api/me | Get the signed-in user
*SystemApi* | [**health**](docs/Api/SystemApi.md#health) | **GET** /api/health | Check that the server is up
*SystemApi* | [**ready**](docs/Api/SystemApi.md#ready) | **GET** /api/ready | Check that the server can take traffic
*TiktokApi* | [**tiktokCreator**](docs/Api/TiktokApi.md#tiktokcreator) | **GET** /api/workspaces/{workspaceId}/channels/{channelId}/tiktok-creator | Read a TikTok channel&#39;s creator

## Models

- [AlreadyMemberEncoded](docs/Model/AlreadyMemberEncoded.md)
- [AltTextTooLongEncoded](docs/Model/AltTextTooLongEncoded.md)
- [AnalyticsSummary](docs/Model/AnalyticsSummary.md)
- [ApiKey](docs/Model/ApiKey.md)
- [ApiKeyNotFoundEncoded](docs/Model/ApiKeyNotFoundEncoded.md)
- [ApiKeysRevoke404Response](docs/Model/ApiKeysRevoke404Response.md)
- [AssistantAction](docs/Model/AssistantAction.md)
- [AssistantActionAnyOf](docs/Model/AssistantActionAnyOf.md)
- [AssistantActionAnyOf1](docs/Model/AssistantActionAnyOf1.md)
- [AssistantActionAnyOf2](docs/Model/AssistantActionAnyOf2.md)
- [AssistantActionAnyOf3](docs/Model/AssistantActionAnyOf3.md)
- [AssistantFailedEncoded](docs/Model/AssistantFailedEncoded.md)
- [AssistantInputRejectedEncoded](docs/Model/AssistantInputRejectedEncoded.md)
- [AssistantQuotaExceededEncoded](docs/Model/AssistantQuotaExceededEncoded.md)
- [AssistantStatus](docs/Model/AssistantStatus.md)
- [AssistantTone](docs/Model/AssistantTone.md)
- [AssistantUnavailableEncoded](docs/Model/AssistantUnavailableEncoded.md)
- [AttemptResult](docs/Model/AttemptResult.md)
- [Authorization](docs/Model/Authorization.md)
- [Billing](docs/Model/Billing.md)
- [BillingSubscription](docs/Model/BillingSubscription.md)
- [Channel](docs/Model/Channel.md)
- [ChannelCannotPostEncoded](docs/Model/ChannelCannotPostEncoded.md)
- [ChannelMetrics](docs/Model/ChannelMetrics.md)
- [ChannelNotFoundEncoded](docs/Model/ChannelNotFoundEncoded.md)
- [ChannelOptions](docs/Model/ChannelOptions.md)
- [ChannelStatus](docs/Model/ChannelStatus.md)
- [ChannelStatusAnyOf](docs/Model/ChannelStatusAnyOf.md)
- [ChannelStatusAnyOf1](docs/Model/ChannelStatusAnyOf1.md)
- [ChannelStatusAnyOf2](docs/Model/ChannelStatusAnyOf2.md)
- [ChannelsCompleteConnect404Response](docs/Model/ChannelsCompleteConnect404Response.md)
- [ChoosableAccount](docs/Model/ChoosableAccount.md)
- [ChooseAccounts](docs/Model/ChooseAccounts.md)
- [ConnectCallback](docs/Model/ConnectCallback.md)
- [ConnectChannel](docs/Model/ConnectChannel.md)
- [ConnectFailedEncoded](docs/Model/ConnectFailedEncoded.md)
- [ConnectFailureReason](docs/Model/ConnectFailureReason.md)
- [ConnectOutcome](docs/Model/ConnectOutcome.md)
- [ConnectOutcomeAnyOf](docs/Model/ConnectOutcomeAnyOf.md)
- [ConnectOutcomeAnyOf1](docs/Model/ConnectOutcomeAnyOf1.md)
- [ConnectablePlatforms](docs/Model/ConnectablePlatforms.md)
- [ContentViolation](docs/Model/ContentViolation.md)
- [ContentViolationAnyOf](docs/Model/ContentViolationAnyOf.md)
- [ContentViolationAnyOf1](docs/Model/ContentViolationAnyOf1.md)
- [ContentViolationAnyOf10](docs/Model/ContentViolationAnyOf10.md)
- [ContentViolationAnyOf11](docs/Model/ContentViolationAnyOf11.md)
- [ContentViolationAnyOf12](docs/Model/ContentViolationAnyOf12.md)
- [ContentViolationAnyOf13](docs/Model/ContentViolationAnyOf13.md)
- [ContentViolationAnyOf14](docs/Model/ContentViolationAnyOf14.md)
- [ContentViolationAnyOf15](docs/Model/ContentViolationAnyOf15.md)
- [ContentViolationAnyOf16](docs/Model/ContentViolationAnyOf16.md)
- [ContentViolationAnyOf17](docs/Model/ContentViolationAnyOf17.md)
- [ContentViolationAnyOf18](docs/Model/ContentViolationAnyOf18.md)
- [ContentViolationAnyOf19](docs/Model/ContentViolationAnyOf19.md)
- [ContentViolationAnyOf2](docs/Model/ContentViolationAnyOf2.md)
- [ContentViolationAnyOf20](docs/Model/ContentViolationAnyOf20.md)
- [ContentViolationAnyOf21](docs/Model/ContentViolationAnyOf21.md)
- [ContentViolationAnyOf22](docs/Model/ContentViolationAnyOf22.md)
- [ContentViolationAnyOf23](docs/Model/ContentViolationAnyOf23.md)
- [ContentViolationAnyOf24](docs/Model/ContentViolationAnyOf24.md)
- [ContentViolationAnyOf24Maximum](docs/Model/ContentViolationAnyOf24Maximum.md)
- [ContentViolationAnyOf25](docs/Model/ContentViolationAnyOf25.md)
- [ContentViolationAnyOf3](docs/Model/ContentViolationAnyOf3.md)
- [ContentViolationAnyOf4](docs/Model/ContentViolationAnyOf4.md)
- [ContentViolationAnyOf5](docs/Model/ContentViolationAnyOf5.md)
- [ContentViolationAnyOf6](docs/Model/ContentViolationAnyOf6.md)
- [ContentViolationAnyOf7](docs/Model/ContentViolationAnyOf7.md)
- [ContentViolationAnyOf8](docs/Model/ContentViolationAnyOf8.md)
- [ContentViolationAnyOf9](docs/Model/ContentViolationAnyOf9.md)
- [CreatedApiKey](docs/Model/CreatedApiKey.md)
- [DatabaseUnavailableEncoded](docs/Model/DatabaseUnavailableEncoded.md)
- [DraftPage](docs/Model/DraftPage.md)
- [EffectHttpApiErrorBadRequestEncoded](docs/Model/EffectHttpApiErrorBadRequestEncoded.md)
- [EngagementDay](docs/Model/EngagementDay.md)
- [FailureReason](docs/Model/FailureReason.md)
- [ForbiddenEncoded](docs/Model/ForbiddenEncoded.md)
- [InvalidDateRangeEncoded](docs/Model/InvalidDateRangeEncoded.md)
- [InvalidTimeRangeEncoded](docs/Model/InvalidTimeRangeEncoded.md)
- [InvalidTimeZoneEncoded](docs/Model/InvalidTimeZoneEncoded.md)
- [Invitation](docs/Model/Invitation.md)
- [InvitationNotFoundEncoded](docs/Model/InvitationNotFoundEncoded.md)
- [InvitationsCreate409Response](docs/Model/InvitationsCreate409Response.md)
- [InvitationsRevoke404Response](docs/Model/InvitationsRevoke404Response.md)
- [MarkNoticesRead](docs/Model/MarkNoticesRead.md)
- [Me](docs/Model/Me.md)
- [MeUser](docs/Model/MeUser.md)
- [Media](docs/Model/Media.md)
- [MediaAttachment](docs/Model/MediaAttachment.md)
- [MediaContentType](docs/Model/MediaContentType.md)
- [MediaCreate422Response](docs/Model/MediaCreate422Response.md)
- [MediaDescription](docs/Model/MediaDescription.md)
- [MediaDimensions](docs/Model/MediaDimensions.md)
- [MediaGet404Response](docs/Model/MediaGet404Response.md)
- [MediaInUseEncoded](docs/Model/MediaInUseEncoded.md)
- [MediaKind](docs/Model/MediaKind.md)
- [MediaNotFoundEncoded](docs/Model/MediaNotFoundEncoded.md)
- [MediaPage](docs/Model/MediaPage.md)
- [MediaStatus](docs/Model/MediaStatus.md)
- [MediaStatusAnyOf](docs/Model/MediaStatusAnyOf.md)
- [MediaStatusAnyOf1](docs/Model/MediaStatusAnyOf1.md)
- [MediaStatusAnyOf2](docs/Model/MediaStatusAnyOf2.md)
- [MediaStatusAnyOf3](docs/Model/MediaStatusAnyOf3.md)
- [MediaStoreUnavailableEncoded](docs/Model/MediaStoreUnavailableEncoded.md)
- [MediaTooLargeEncoded](docs/Model/MediaTooLargeEncoded.md)
- [MediaUsage](docs/Model/MediaUsage.md)
- [Membership](docs/Model/Membership.md)
- [MetricTotals](docs/Model/MetricTotals.md)
- [MetricsSnapshot](docs/Model/MetricsSnapshot.md)
- [NewApiKey](docs/Model/NewApiKey.md)
- [NewInvitation](docs/Model/NewInvitation.md)
- [NewUpload](docs/Model/NewUpload.md)
- [NonFiniteNumber](docs/Model/NonFiniteNumber.md)
- [Notice](docs/Model/Notice.md)
- [NoticeChannel](docs/Model/NoticeChannel.md)
- [NoticeEvent](docs/Model/NoticeEvent.md)
- [NoticeEventAnyOf](docs/Model/NoticeEventAnyOf.md)
- [NoticeEventAnyOf1](docs/Model/NoticeEventAnyOf1.md)
- [NoticeEventAnyOf2](docs/Model/NoticeEventAnyOf2.md)
- [NoticeEventAnyOf3](docs/Model/NoticeEventAnyOf3.md)
- [NoticeEventAnyOf4](docs/Model/NoticeEventAnyOf4.md)
- [NoticePage](docs/Model/NoticePage.md)
- [NotificationPreferences](docs/Model/NotificationPreferences.md)
- [NotificationPreferencesChange](docs/Model/NotificationPreferencesChange.md)
- [NotificationPreferencesChangeEmail](docs/Model/NotificationPreferencesChangeEmail.md)
- [NotificationPreferencesEmail](docs/Model/NotificationPreferencesEmail.md)
- [PaidPlan](docs/Model/PaidPlan.md)
- [PeriodUsage](docs/Model/PeriodUsage.md)
- [Permission](docs/Model/Permission.md)
- [Plan](docs/Model/Plan.md)
- [PlanAllowances](docs/Model/PlanAllowances.md)
- [PlanLimit](docs/Model/PlanLimit.md)
- [PlanLimitReachedEncoded](docs/Model/PlanLimitReachedEncoded.md)
- [PlanOffer](docs/Model/PlanOffer.md)
- [Platform](docs/Model/Platform.md)
- [PlatformUnreachableEncoded](docs/Model/PlatformUnreachableEncoded.md)
- [Post](docs/Model/Post.md)
- [PostAnalytics](docs/Model/PostAnalytics.md)
- [PostContent](docs/Model/PostContent.md)
- [PostContentInvalidEncoded](docs/Model/PostContentInvalidEncoded.md)
- [PostDraft](docs/Model/PostDraft.md)
- [PostMetrics](docs/Model/PostMetrics.md)
- [PostNotFoundEncoded](docs/Model/PostNotFoundEncoded.md)
- [PostOutcome](docs/Model/PostOutcome.md)
- [PostSchedule](docs/Model/PostSchedule.md)
- [PostStatus](docs/Model/PostStatus.md)
- [PostStatusConflictEncoded](docs/Model/PostStatusConflictEncoded.md)
- [PostTarget](docs/Model/PostTarget.md)
- [PostTargetStatus](docs/Model/PostTargetStatus.md)
- [PostsCreate422Response](docs/Model/PostsCreate422Response.md)
- [PostsGet404Response](docs/Model/PostsGet404Response.md)
- [PostsRepost409Response](docs/Model/PostsRepost409Response.md)
- [PostsSchedule422Response](docs/Model/PostsSchedule422Response.md)
- [PreparedUpload](docs/Model/PreparedUpload.md)
- [ProbeState](docs/Model/ProbeState.md)
- [PublicationAttempt](docs/Model/PublicationAttempt.md)
- [RejectionReason](docs/Model/RejectionReason.md)
- [Role](docs/Model/Role.md)
- [ScheduleInPastEncoded](docs/Model/ScheduleInPastEncoded.md)
- [SchedulePost](docs/Model/SchedulePost.md)
- [SignedRequest](docs/Model/SignedRequest.md)
- [SubscriptionStatus](docs/Model/SubscriptionStatus.md)
- [Suggestion](docs/Model/Suggestion.md)
- [SuggestionAnyOf](docs/Model/SuggestionAnyOf.md)
- [SuggestionAnyOf1](docs/Model/SuggestionAnyOf1.md)
- [SuggestionRequest](docs/Model/SuggestionRequest.md)
- [TargetConfirmation](docs/Model/TargetConfirmation.md)
- [TargetConfirmationAnyOf](docs/Model/TargetConfirmationAnyOf.md)
- [TargetConfirmationAnyOf1](docs/Model/TargetConfirmationAnyOf1.md)
- [TargetMetrics](docs/Model/TargetMetrics.md)
- [TargetOptions](docs/Model/TargetOptions.md)
- [TargetStatusConflictEncoded](docs/Model/TargetStatusConflictEncoded.md)
- [TextOverride](docs/Model/TextOverride.md)
- [TextUnit](docs/Model/TextUnit.md)
- [TikTokAccount](docs/Model/TikTokAccount.md)
- [TikTokAccountPosting](docs/Model/TikTokAccountPosting.md)
- [TikTokAccountPostingAnyOf](docs/Model/TikTokAccountPostingAnyOf.md)
- [TikTokAccountPostingAnyOf1](docs/Model/TikTokAccountPostingAnyOf1.md)
- [TikTokBlock](docs/Model/TikTokBlock.md)
- [TikTokCreator](docs/Model/TikTokCreator.md)
- [TikTokOptions](docs/Model/TikTokOptions.md)
- [TikTokPrivacyLevel](docs/Model/TikTokPrivacyLevel.md)
- [TooManyInvitationsEncoded](docs/Model/TooManyInvitationsEncoded.md)
- [TopPost](docs/Model/TopPost.md)
- [TranslationLanguage](docs/Model/TranslationLanguage.md)
- [UnauthenticatedEncoded](docs/Model/UnauthenticatedEncoded.md)
- [UnconfirmedReason](docs/Model/UnconfirmedReason.md)
- [UnknownChannelsEncoded](docs/Model/UnknownChannelsEncoded.md)
- [UnknownMediaEncoded](docs/Model/UnknownMediaEncoded.md)
- [UnreadNotices](docs/Model/UnreadNotices.md)
- [UnsupportedMediaTypeEncoded](docs/Model/UnsupportedMediaTypeEncoded.md)
- [UploadIncompleteEncoded](docs/Model/UploadIncompleteEncoded.md)
- [UploadPart](docs/Model/UploadPart.md)
- [UploadRejectedEncoded](docs/Model/UploadRejectedEncoded.md)
- [UploadTarget](docs/Model/UploadTarget.md)
- [UploadTargetAnyOf](docs/Model/UploadTargetAnyOf.md)
- [UploadTargetAnyOf1](docs/Model/UploadTargetAnyOf1.md)
- [Usage](docs/Model/Usage.md)
- [WorkspaceMember](docs/Model/WorkspaceMember.md)
- [WorkspaceNotFoundEncoded](docs/Model/WorkspaceNotFoundEncoded.md)
- [YouTubeOptions](docs/Model/YouTubeOptions.md)
- [YouTubePrivacy](docs/Model/YouTubePrivacy.md)

## Authorization

Authentication schemes defined for the API:
### bearer

- **Type**: Bearer authentication

## Tests

To run the tests, use:

```bash
composer install
vendor/bin/phpunit
```

## Author

hello@peal.social

## About this package

This PHP package is automatically generated by the [OpenAPI Generator](https://openapi-generator.tech) project:

- API version: `0.0.1`
    - Package version: `0.2.0`
    - Generator version: `7.27.0`
- Build package: `org.openapitools.codegen.languages.PhpClientCodegen`
