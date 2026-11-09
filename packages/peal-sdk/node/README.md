# peal-sdk@0.2.0

A TypeScript SDK client for the app.peal.social API.

## Usage

First, install the SDK from npm.

```bash
npm install peal-sdk --save
```

Next, try it out.


```ts
import {
  Configuration,
  AnalyticsApi,
} from 'peal-sdk';
import type { AnalyticsPostRequest } from 'peal-sdk';

async function example() {
  console.log("🚀 Testing peal-sdk SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new AnalyticsApi(config);

  const body = {
    // string
    workspaceId: workspaceId_example,
    // string
    postId: postId_example,
  } satisfies AnalyticsPostRequest;

  try {
    const data = await api.analyticsPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```


## Documentation

### API Endpoints

All URIs are relative to *https://app.peal.social*

| Class | Method | HTTP request | Description
| ----- | ------ | ------------ | -------------
*AnalyticsApi* | [**analyticsPost**](docs/AnalyticsApi.md#analyticspost) | **GET** /api/workspaces/{workspaceId}/analytics/posts/{postId} | Get a post\&#39;s analytics
*AnalyticsApi* | [**analyticsSummary**](docs/AnalyticsApi.md#analyticssummary) | **GET** /api/workspaces/{workspaceId}/analytics/summary | Summarize the workspace\&#39;s analytics
*ApiKeysApi* | [**apiKeysCreate**](docs/ApiKeysApi.md#apikeyscreate) | **POST** /api/workspaces/{workspaceId}/api-keys | Create an API key
*ApiKeysApi* | [**apiKeysList**](docs/ApiKeysApi.md#apikeyslist) | **GET** /api/workspaces/{workspaceId}/api-keys | List API keys
*ApiKeysApi* | [**apiKeysRevoke**](docs/ApiKeysApi.md#apikeysrevoke) | **DELETE** /api/workspaces/{workspaceId}/api-keys/{apiKeyId} | Revoke an API key
*AssistantApi* | [**assistantStatus**](docs/AssistantApi.md#assistantstatus) | **GET** /api/workspaces/{workspaceId}/assistant | Get the assistant\&#39;s status
*AssistantApi* | [**assistantSuggest**](docs/AssistantApi.md#assistantsuggest) | **POST** /api/workspaces/{workspaceId}/assistant/suggestions | Suggest a change to a post\&#39;s text
*BillingApi* | [**billingGet**](docs/BillingApi.md#billingget) | **GET** /api/workspaces/{workspaceId}/billing | Get the workspace\&#39;s billing
*ChannelsApi* | [**channelsChooseAccounts**](docs/ChannelsApi.md#channelschooseaccounts) | **POST** /api/workspaces/{workspaceId}/channels/connect/{platform}/accounts | Choose the accounts to connect
*ChannelsApi* | [**channelsCompleteConnect**](docs/ChannelsApi.md#channelscompleteconnect) | **POST** /api/workspaces/{workspaceId}/channels/connect/{platform}/callback | Complete connecting an account
*ChannelsApi* | [**channelsConnect**](docs/ChannelsApi.md#channelsconnect) | **POST** /api/workspaces/{workspaceId}/channels/connect/{platform} | Start connecting an account
*ChannelsApi* | [**channelsDisconnect**](docs/ChannelsApi.md#channelsdisconnect) | **DELETE** /api/workspaces/{workspaceId}/channels/{channelId} | Disconnect a channel
*ChannelsApi* | [**channelsList**](docs/ChannelsApi.md#channelslist) | **GET** /api/workspaces/{workspaceId}/channels | List channels
*ChannelsApi* | [**channelsPlatforms**](docs/ChannelsApi.md#channelsplatforms) | **GET** /api/workspaces/{workspaceId}/channels/platforms | List connectable platforms
*ChannelsApi* | [**channelsReconnect**](docs/ChannelsApi.md#channelsreconnect) | **POST** /api/workspaces/{workspaceId}/channels/{channelId}/reconnect | Start reconnecting a channel
*InvitationsApi* | [**invitationsCreate**](docs/InvitationsApi.md#invitationscreate) | **POST** /api/workspaces/{workspaceId}/invitations | Invite someone
*InvitationsApi* | [**invitationsList**](docs/InvitationsApi.md#invitationslist) | **GET** /api/workspaces/{workspaceId}/invitations | List invitations
*InvitationsApi* | [**invitationsRevoke**](docs/InvitationsApi.md#invitationsrevoke) | **DELETE** /api/workspaces/{workspaceId}/invitations/{invitationId} | Revoke an invitation
*MediaApi* | [**mediaComplete**](docs/MediaApi.md#mediacomplete) | **POST** /api/workspaces/{workspaceId}/media/{mediaId}/complete | Complete an upload
*MediaApi* | [**mediaCreate**](docs/MediaApi.md#mediacreate) | **POST** /api/workspaces/{workspaceId}/media | Start an upload
*MediaApi* | [**mediaDelete**](docs/MediaApi.md#mediadelete) | **DELETE** /api/workspaces/{workspaceId}/media/{mediaId} | Delete media
*MediaApi* | [**mediaDescribe**](docs/MediaApi.md#mediadescribe) | **PATCH** /api/workspaces/{workspaceId}/media/{mediaId} | Describe media
*MediaApi* | [**mediaGet**](docs/MediaApi.md#mediaget) | **GET** /api/workspaces/{workspaceId}/media/{mediaId} | Get media
*MediaApi* | [**mediaList**](docs/MediaApi.md#medialist) | **GET** /api/workspaces/{workspaceId}/media | List media
*MediaApi* | [**mediaUsage**](docs/MediaApi.md#mediausage) | **GET** /api/workspaces/{workspaceId}/media/{mediaId}/usage | Get where media is used
*MembersApi* | [**membersList**](docs/MembersApi.md#memberslist) | **GET** /api/workspaces/{workspaceId}/members | List members
*NoticesApi* | [**noticesList**](docs/NoticesApi.md#noticeslist) | **GET** /api/me/notices | List notices
*NoticesApi* | [**noticesMarkAllRead**](docs/NoticesApi.md#noticesmarkallread) | **POST** /api/me/notices/read-all | Mark all notices read
*NoticesApi* | [**noticesMarkRead**](docs/NoticesApi.md#noticesmarkread) | **POST** /api/me/notices/read | Mark notices read
*NoticesApi* | [**noticesUnread**](docs/NoticesApi.md#noticesunread) | **GET** /api/me/notices/unread | Count unread notices
*NotificationPreferencesApi* | [**notificationPreferencesGet**](docs/NotificationPreferencesApi.md#notificationpreferencesget) | **GET** /api/me/notification-preferences | Get notification preferences
*NotificationPreferencesApi* | [**notificationPreferencesUpdate**](docs/NotificationPreferencesApi.md#notificationpreferencesupdate) | **PATCH** /api/me/notification-preferences | Change notification preferences
*PostsApi* | [**postsAttempts**](docs/PostsApi.md#postsattempts) | **GET** /api/workspaces/{workspaceId}/posts/{postId}/attempts | List a post\&#39;s attempts
*PostsApi* | [**postsCancel**](docs/PostsApi.md#postscancel) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/cancel | Cancel a post
*PostsApi* | [**postsConfirm**](docs/PostsApi.md#postsconfirm) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/targets/{targetId}/confirm | Confirm a post on a channel
*PostsApi* | [**postsCreate**](docs/PostsApi.md#postscreate) | **POST** /api/workspaces/{workspaceId}/posts | Create a draft
*PostsApi* | [**postsDiscard**](docs/PostsApi.md#postsdiscard) | **DELETE** /api/workspaces/{workspaceId}/posts/{postId} | Discard a draft
*PostsApi* | [**postsDrafts**](docs/PostsApi.md#postsdrafts) | **GET** /api/workspaces/{workspaceId}/posts/drafts | List drafts
*PostsApi* | [**postsGet**](docs/PostsApi.md#postsget) | **GET** /api/workspaces/{workspaceId}/posts/{postId} | Get a post
*PostsApi* | [**postsList**](docs/PostsApi.md#postslist) | **GET** /api/workspaces/{workspaceId}/posts | List scheduled posts
*PostsApi* | [**postsRepost**](docs/PostsApi.md#postsrepost) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/targets/{targetId}/repost | Repost on a channel
*PostsApi* | [**postsReschedule**](docs/PostsApi.md#postsreschedule) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/reschedule | Reschedule a post
*PostsApi* | [**postsSchedule**](docs/PostsApi.md#postsschedule) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/schedule | Schedule a draft
*PostsApi* | [**postsUnschedule**](docs/PostsApi.md#postsunschedule) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/unschedule | Unschedule a post
*PostsApi* | [**postsUpdate**](docs/PostsApi.md#postsupdate) | **PUT** /api/workspaces/{workspaceId}/posts/{postId} | Update a draft
*SessionApi* | [**sessionMe**](docs/SessionApi.md#sessionme) | **GET** /api/me | Get the signed-in user
*SystemApi* | [**health**](docs/SystemApi.md#health) | **GET** /api/health | Check that the server is up
*SystemApi* | [**ready**](docs/SystemApi.md#ready) | **GET** /api/ready | Check that the server can take traffic
*TiktokApi* | [**tiktokCreator**](docs/TiktokApi.md#tiktokcreator) | **GET** /api/workspaces/{workspaceId}/channels/{channelId}/tiktok-creator | Read a TikTok channel\&#39;s creator


### Models

- [AlreadyMemberEncoded](docs/AlreadyMemberEncoded.md)
- [AltTextTooLongEncoded](docs/AltTextTooLongEncoded.md)
- [AnalyticsSummary](docs/AnalyticsSummary.md)
- [ApiKey](docs/ApiKey.md)
- [ApiKeyNotFoundEncoded](docs/ApiKeyNotFoundEncoded.md)
- [ApiKeysRevoke404Response](docs/ApiKeysRevoke404Response.md)
- [AssistantAction](docs/AssistantAction.md)
- [AssistantActionAnyOf](docs/AssistantActionAnyOf.md)
- [AssistantActionAnyOf1](docs/AssistantActionAnyOf1.md)
- [AssistantActionAnyOf2](docs/AssistantActionAnyOf2.md)
- [AssistantActionAnyOf3](docs/AssistantActionAnyOf3.md)
- [AssistantFailedEncoded](docs/AssistantFailedEncoded.md)
- [AssistantInputRejectedEncoded](docs/AssistantInputRejectedEncoded.md)
- [AssistantQuotaExceededEncoded](docs/AssistantQuotaExceededEncoded.md)
- [AssistantStatus](docs/AssistantStatus.md)
- [AssistantTone](docs/AssistantTone.md)
- [AssistantUnavailableEncoded](docs/AssistantUnavailableEncoded.md)
- [AttemptResult](docs/AttemptResult.md)
- [Authorization](docs/Authorization.md)
- [Billing](docs/Billing.md)
- [BillingInterval](docs/BillingInterval.md)
- [BillingSubscription](docs/BillingSubscription.md)
- [Channel](docs/Channel.md)
- [ChannelCannotPostEncoded](docs/ChannelCannotPostEncoded.md)
- [ChannelMetrics](docs/ChannelMetrics.md)
- [ChannelNotFoundEncoded](docs/ChannelNotFoundEncoded.md)
- [ChannelOptions](docs/ChannelOptions.md)
- [ChannelStatus](docs/ChannelStatus.md)
- [ChannelStatusAnyOf](docs/ChannelStatusAnyOf.md)
- [ChannelStatusAnyOf1](docs/ChannelStatusAnyOf1.md)
- [ChannelStatusAnyOf2](docs/ChannelStatusAnyOf2.md)
- [ChannelsCompleteConnect404Response](docs/ChannelsCompleteConnect404Response.md)
- [ChoosableAccount](docs/ChoosableAccount.md)
- [ChooseAccounts](docs/ChooseAccounts.md)
- [ConnectCallback](docs/ConnectCallback.md)
- [ConnectChannel](docs/ConnectChannel.md)
- [ConnectFailedEncoded](docs/ConnectFailedEncoded.md)
- [ConnectFailureReason](docs/ConnectFailureReason.md)
- [ConnectOutcome](docs/ConnectOutcome.md)
- [ConnectOutcomeAnyOf](docs/ConnectOutcomeAnyOf.md)
- [ConnectOutcomeAnyOf1](docs/ConnectOutcomeAnyOf1.md)
- [ConnectablePlatforms](docs/ConnectablePlatforms.md)
- [ContentViolation](docs/ContentViolation.md)
- [ContentViolationAnyOf](docs/ContentViolationAnyOf.md)
- [ContentViolationAnyOf1](docs/ContentViolationAnyOf1.md)
- [ContentViolationAnyOf10](docs/ContentViolationAnyOf10.md)
- [ContentViolationAnyOf11](docs/ContentViolationAnyOf11.md)
- [ContentViolationAnyOf12](docs/ContentViolationAnyOf12.md)
- [ContentViolationAnyOf13](docs/ContentViolationAnyOf13.md)
- [ContentViolationAnyOf14](docs/ContentViolationAnyOf14.md)
- [ContentViolationAnyOf15](docs/ContentViolationAnyOf15.md)
- [ContentViolationAnyOf16](docs/ContentViolationAnyOf16.md)
- [ContentViolationAnyOf17](docs/ContentViolationAnyOf17.md)
- [ContentViolationAnyOf18](docs/ContentViolationAnyOf18.md)
- [ContentViolationAnyOf19](docs/ContentViolationAnyOf19.md)
- [ContentViolationAnyOf2](docs/ContentViolationAnyOf2.md)
- [ContentViolationAnyOf20](docs/ContentViolationAnyOf20.md)
- [ContentViolationAnyOf21](docs/ContentViolationAnyOf21.md)
- [ContentViolationAnyOf22](docs/ContentViolationAnyOf22.md)
- [ContentViolationAnyOf23](docs/ContentViolationAnyOf23.md)
- [ContentViolationAnyOf24](docs/ContentViolationAnyOf24.md)
- [ContentViolationAnyOf24Maximum](docs/ContentViolationAnyOf24Maximum.md)
- [ContentViolationAnyOf25](docs/ContentViolationAnyOf25.md)
- [ContentViolationAnyOf3](docs/ContentViolationAnyOf3.md)
- [ContentViolationAnyOf4](docs/ContentViolationAnyOf4.md)
- [ContentViolationAnyOf5](docs/ContentViolationAnyOf5.md)
- [ContentViolationAnyOf6](docs/ContentViolationAnyOf6.md)
- [ContentViolationAnyOf7](docs/ContentViolationAnyOf7.md)
- [ContentViolationAnyOf8](docs/ContentViolationAnyOf8.md)
- [ContentViolationAnyOf9](docs/ContentViolationAnyOf9.md)
- [CreatedApiKey](docs/CreatedApiKey.md)
- [DatabaseUnavailableEncoded](docs/DatabaseUnavailableEncoded.md)
- [DraftPage](docs/DraftPage.md)
- [EffectHttpApiErrorBadRequestEncoded](docs/EffectHttpApiErrorBadRequestEncoded.md)
- [EngagementDay](docs/EngagementDay.md)
- [FailureReason](docs/FailureReason.md)
- [ForbiddenEncoded](docs/ForbiddenEncoded.md)
- [InvalidDateRangeEncoded](docs/InvalidDateRangeEncoded.md)
- [InvalidTimeRangeEncoded](docs/InvalidTimeRangeEncoded.md)
- [InvalidTimeZoneEncoded](docs/InvalidTimeZoneEncoded.md)
- [Invitation](docs/Invitation.md)
- [InvitationNotFoundEncoded](docs/InvitationNotFoundEncoded.md)
- [InvitationsCreate409Response](docs/InvitationsCreate409Response.md)
- [InvitationsRevoke404Response](docs/InvitationsRevoke404Response.md)
- [MarkNoticesRead](docs/MarkNoticesRead.md)
- [Me](docs/Me.md)
- [MeUser](docs/MeUser.md)
- [Media](docs/Media.md)
- [MediaAttachment](docs/MediaAttachment.md)
- [MediaContentType](docs/MediaContentType.md)
- [MediaCreate422Response](docs/MediaCreate422Response.md)
- [MediaDescription](docs/MediaDescription.md)
- [MediaDimensions](docs/MediaDimensions.md)
- [MediaGet404Response](docs/MediaGet404Response.md)
- [MediaInUseEncoded](docs/MediaInUseEncoded.md)
- [MediaKind](docs/MediaKind.md)
- [MediaNotFoundEncoded](docs/MediaNotFoundEncoded.md)
- [MediaPage](docs/MediaPage.md)
- [MediaStatus](docs/MediaStatus.md)
- [MediaStatusAnyOf](docs/MediaStatusAnyOf.md)
- [MediaStatusAnyOf1](docs/MediaStatusAnyOf1.md)
- [MediaStatusAnyOf2](docs/MediaStatusAnyOf2.md)
- [MediaStatusAnyOf3](docs/MediaStatusAnyOf3.md)
- [MediaStoreUnavailableEncoded](docs/MediaStoreUnavailableEncoded.md)
- [MediaTooLargeEncoded](docs/MediaTooLargeEncoded.md)
- [MediaUsage](docs/MediaUsage.md)
- [Membership](docs/Membership.md)
- [MetricTotals](docs/MetricTotals.md)
- [MetricsSnapshot](docs/MetricsSnapshot.md)
- [Money](docs/Money.md)
- [NewApiKey](docs/NewApiKey.md)
- [NewInvitation](docs/NewInvitation.md)
- [NewUpload](docs/NewUpload.md)
- [NonFiniteNumber](docs/NonFiniteNumber.md)
- [Notice](docs/Notice.md)
- [NoticeChannel](docs/NoticeChannel.md)
- [NoticeEvent](docs/NoticeEvent.md)
- [NoticeEventAnyOf](docs/NoticeEventAnyOf.md)
- [NoticeEventAnyOf1](docs/NoticeEventAnyOf1.md)
- [NoticeEventAnyOf2](docs/NoticeEventAnyOf2.md)
- [NoticeEventAnyOf3](docs/NoticeEventAnyOf3.md)
- [NoticeEventAnyOf4](docs/NoticeEventAnyOf4.md)
- [NoticeEventAnyOf5](docs/NoticeEventAnyOf5.md)
- [NoticeEventAnyOf6](docs/NoticeEventAnyOf6.md)
- [NoticeEventAnyOf7](docs/NoticeEventAnyOf7.md)
- [NoticeEventAnyOf8](docs/NoticeEventAnyOf8.md)
- [NoticeEventAnyOf9](docs/NoticeEventAnyOf9.md)
- [NoticePage](docs/NoticePage.md)
- [NotificationPreferences](docs/NotificationPreferences.md)
- [NotificationPreferencesChange](docs/NotificationPreferencesChange.md)
- [NotificationPreferencesChangeEmail](docs/NotificationPreferencesChangeEmail.md)
- [NotificationPreferencesEmail](docs/NotificationPreferencesEmail.md)
- [PaidPlan](docs/PaidPlan.md)
- [PeriodUsage](docs/PeriodUsage.md)
- [Permission](docs/Permission.md)
- [Plan](docs/Plan.md)
- [PlanAllowances](docs/PlanAllowances.md)
- [PlanLimit](docs/PlanLimit.md)
- [PlanLimitReachedEncoded](docs/PlanLimitReachedEncoded.md)
- [PlanOffer](docs/PlanOffer.md)
- [PlanPrice](docs/PlanPrice.md)
- [Platform](docs/Platform.md)
- [PlatformUnreachableEncoded](docs/PlatformUnreachableEncoded.md)
- [Post](docs/Post.md)
- [PostAnalytics](docs/PostAnalytics.md)
- [PostContent](docs/PostContent.md)
- [PostContentInvalidEncoded](docs/PostContentInvalidEncoded.md)
- [PostDraft](docs/PostDraft.md)
- [PostMetrics](docs/PostMetrics.md)
- [PostNotFoundEncoded](docs/PostNotFoundEncoded.md)
- [PostOutcome](docs/PostOutcome.md)
- [PostSchedule](docs/PostSchedule.md)
- [PostStatus](docs/PostStatus.md)
- [PostStatusConflictEncoded](docs/PostStatusConflictEncoded.md)
- [PostTarget](docs/PostTarget.md)
- [PostTargetStatus](docs/PostTargetStatus.md)
- [PostsCreate422Response](docs/PostsCreate422Response.md)
- [PostsGet404Response](docs/PostsGet404Response.md)
- [PostsRepost409Response](docs/PostsRepost409Response.md)
- [PostsSchedule422Response](docs/PostsSchedule422Response.md)
- [PreparedUpload](docs/PreparedUpload.md)
- [ProbeState](docs/ProbeState.md)
- [PublicationAttempt](docs/PublicationAttempt.md)
- [RejectionReason](docs/RejectionReason.md)
- [Role](docs/Role.md)
- [ScheduleInPastEncoded](docs/ScheduleInPastEncoded.md)
- [SchedulePost](docs/SchedulePost.md)
- [SignedRequest](docs/SignedRequest.md)
- [SubscriptionStatus](docs/SubscriptionStatus.md)
- [Suggestion](docs/Suggestion.md)
- [SuggestionAnyOf](docs/SuggestionAnyOf.md)
- [SuggestionAnyOf1](docs/SuggestionAnyOf1.md)
- [SuggestionRequest](docs/SuggestionRequest.md)
- [TargetConfirmation](docs/TargetConfirmation.md)
- [TargetConfirmationAnyOf](docs/TargetConfirmationAnyOf.md)
- [TargetConfirmationAnyOf1](docs/TargetConfirmationAnyOf1.md)
- [TargetMetrics](docs/TargetMetrics.md)
- [TargetOptions](docs/TargetOptions.md)
- [TargetStatusConflictEncoded](docs/TargetStatusConflictEncoded.md)
- [TextOverride](docs/TextOverride.md)
- [TextUnit](docs/TextUnit.md)
- [TikTokAccount](docs/TikTokAccount.md)
- [TikTokAccountPosting](docs/TikTokAccountPosting.md)
- [TikTokAccountPostingAnyOf](docs/TikTokAccountPostingAnyOf.md)
- [TikTokAccountPostingAnyOf1](docs/TikTokAccountPostingAnyOf1.md)
- [TikTokBlock](docs/TikTokBlock.md)
- [TikTokCreator](docs/TikTokCreator.md)
- [TikTokOptions](docs/TikTokOptions.md)
- [TikTokPrivacyLevel](docs/TikTokPrivacyLevel.md)
- [TooManyInvitationsEncoded](docs/TooManyInvitationsEncoded.md)
- [TopPost](docs/TopPost.md)
- [TranslationLanguage](docs/TranslationLanguage.md)
- [TrialOffer](docs/TrialOffer.md)
- [UnauthenticatedEncoded](docs/UnauthenticatedEncoded.md)
- [UnconfirmedReason](docs/UnconfirmedReason.md)
- [UnknownChannelsEncoded](docs/UnknownChannelsEncoded.md)
- [UnknownMediaEncoded](docs/UnknownMediaEncoded.md)
- [UnreadNotices](docs/UnreadNotices.md)
- [UnsupportedMediaTypeEncoded](docs/UnsupportedMediaTypeEncoded.md)
- [UploadIncompleteEncoded](docs/UploadIncompleteEncoded.md)
- [UploadPart](docs/UploadPart.md)
- [UploadRejectedEncoded](docs/UploadRejectedEncoded.md)
- [UploadTarget](docs/UploadTarget.md)
- [UploadTargetAnyOf](docs/UploadTargetAnyOf.md)
- [UploadTargetAnyOf1](docs/UploadTargetAnyOf1.md)
- [Usage](docs/Usage.md)
- [WorkspaceMember](docs/WorkspaceMember.md)
- [WorkspaceNotFoundEncoded](docs/WorkspaceNotFoundEncoded.md)
- [YouTubeOptions](docs/YouTubeOptions.md)
- [YouTubePrivacy](docs/YouTubePrivacy.md)

### Authorization


Authentication schemes defined for the API:
<a id="bearer"></a>
#### bearer


- **Type**: HTTP Bearer Token authentication

## About

This TypeScript SDK client supports the [Fetch API](https://fetch.spec.whatwg.org/)
and is automatically generated by the
[OpenAPI Generator](https://openapi-generator.tech) project:

- API version: `0.0.1`
- Package version: `0.2.0`
- Generator version: `7.27.0`
- Build package: `org.openapitools.codegen.languages.TypeScriptFetchClientCodegen`

The generated npm module supports the following:

- Environments
  * Node.js
  * Webpack
  * Browserify
- Language levels
  * ES5 - you must have a Promises/A+ library installed
  * ES6
- Module systems
  * CommonJS
  * ES6 module system

For more information, please visit [https://peal.social](https://peal.social)

## Development

### Building

To build the TypeScript source code, you need to have Node.js and npm installed.
After cloning the repository, navigate to the project directory and run:

```bash
npm install
npm run build
```

### Publishing

Once you've built the package, you can publish it to npm:

```bash
npm publish
```

## License

[Apache-2.0]()
