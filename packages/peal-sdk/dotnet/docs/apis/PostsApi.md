# Peal.Api.PostsApi

All URIs are relative to *https://app.peal.social*

| Method | HTTP request | Description |
|--------|--------------|-------------|
| [**PostsAttempts**](PostsApi.md#postsattempts) | **GET** /api/workspaces/{workspaceId}/posts/{postId}/attempts | List a post&#39;s attempts |
| [**PostsCancel**](PostsApi.md#postscancel) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/cancel | Cancel a post |
| [**PostsConfirm**](PostsApi.md#postsconfirm) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/targets/{targetId}/confirm | Confirm a post on a channel |
| [**PostsCreate**](PostsApi.md#postscreate) | **POST** /api/workspaces/{workspaceId}/posts | Create a draft |
| [**PostsDiscard**](PostsApi.md#postsdiscard) | **DELETE** /api/workspaces/{workspaceId}/posts/{postId} | Discard a draft |
| [**PostsDrafts**](PostsApi.md#postsdrafts) | **GET** /api/workspaces/{workspaceId}/posts/drafts | List drafts |
| [**PostsGet**](PostsApi.md#postsget) | **GET** /api/workspaces/{workspaceId}/posts/{postId} | Get a post |
| [**PostsList**](PostsApi.md#postslist) | **GET** /api/workspaces/{workspaceId}/posts | List scheduled posts |
| [**PostsRepost**](PostsApi.md#postsrepost) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/targets/{targetId}/repost | Repost on a channel |
| [**PostsReschedule**](PostsApi.md#postsreschedule) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/reschedule | Reschedule a post |
| [**PostsSchedule**](PostsApi.md#postsschedule) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/schedule | Schedule a draft |
| [**PostsUnschedule**](PostsApi.md#postsunschedule) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/unschedule | Unschedule a post |
| [**PostsUpdate**](PostsApi.md#postsupdate) | **PUT** /api/workspaces/{workspaceId}/posts/{postId} | Update a draft |

<a id="postsattempts"></a>
# **PostsAttempts**
> List&lt;PublicationAttempt&gt; PostsAttempts (string workspaceId, string postId)

List a post's attempts

Lists every attempt Peal made at publishing the post, by channel, round and attempt, with how each ended. An attempt still in progress is not listed yet. Needs post:read.


### Parameters

| Name | Type | Description | Notes |
|------|------|-------------|-------|
| **workspaceId** | **string** |  |  |
| **postId** | **string** |  |  |

### Return type

[**List&lt;PublicationAttempt&gt;**](PublicationAttempt.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Success |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no post with this id. | No workspace with this id is open to the caller. |  -  |

[[Back to top]](#) [[Back to API list]](../../README.md#documentation-for-api-endpoints) [[Back to Model list]](../../README.md#documentation-for-models) [[Back to README]](../../README.md)

<a id="postscancel"></a>
# **PostsCancel**
> Post PostsCancel (string workspaceId, string postId)

Cancel a post

Cancels a draft or a scheduled post. A post already publishing finishes with what its channels did: those not yet sent are cancelled. Needs post:schedule.


### Parameters

| Name | Type | Description | Notes |
|------|------|-------------|-------|
| **workspaceId** | **string** |  |  |
| **postId** | **string** |  |  |

### Return type

[**Post**](Post.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Post |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no post with this id. | No workspace with this id is open to the caller. |  -  |
| **409** | The post&#39;s status does not allow this. &#x60;status&#x60; is the status it has. |  -  |

[[Back to top]](#) [[Back to API list]](../../README.md#documentation-for-api-endpoints) [[Back to Model list]](../../README.md#documentation-for-models) [[Back to README]](../../README.md)

<a id="postsconfirm"></a>
# **PostsConfirm**
> Post PostsConfirm (string workspaceId, string postId, string targetId, TargetConfirmation targetConfirmation)

Confirm a post on a channel

Says what you found on the platform for a post unconfirmed on one channel: `published`, with its address if you have it, or `notPublished`, which fails it there so it can be reposted. Its notifications are marked read. Needs post:schedule.


### Parameters

| Name | Type | Description | Notes |
|------|------|-------------|-------|
| **workspaceId** | **string** |  |  |
| **postId** | **string** |  |  |
| **targetId** | **string** |  |  |
| **targetConfirmation** | [**TargetConfirmation**](TargetConfirmation.md) |  |  |

### Return type

[**Post**](Post.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Post |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no post with this id. | No workspace with this id is open to the caller. |  -  |
| **409** | The post&#39;s status does not allow this. &#x60;status&#x60; is the status it has. | The post&#39;s status on that channel does not allow this. &#x60;status&#x60; is the status it has. |  -  |

[[Back to top]](#) [[Back to API list]](../../README.md#documentation-for-api-endpoints) [[Back to Model list]](../../README.md#documentation-for-models) [[Back to README]](../../README.md)

<a id="postscreate"></a>
# **PostsCreate**
> Post PostsCreate (string workspaceId, PostDraft postDraft)

Create a draft

Creates a draft for some of the workspace's channels, possibly none yet, with options on those whose platform takes them (`TargetOptions`, of the channel's platform). Its media must be the workspace's, and ready. Its text, media and options are checked against each platform's rules when it is scheduled, not before. Needs post:create, channel:read, and media:read when it shows media.


### Parameters

| Name | Type | Description | Notes |
|------|------|-------------|-------|
| **workspaceId** | **string** |  |  |
| **postDraft** | [**PostDraft**](PostDraft.md) |  |  |

### Return type

[**Post**](Post.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | Post |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | No workspace with this id is open to the caller. |  -  |
| **422** | The post&#39;s content breaks the rules of its channels&#39; platforms: &#x60;violations&#x60; says how, channel by channel, for its images and videos, media by media, and for its options on a channel, option by option (&#x60;field&#x60;). | Some channels asked for are not connected to the workspace: &#x60;channelIds&#x60; lists them. | Some media attached are not the workspace&#39;s, or not ready to show: &#x60;mediaIds&#x60; lists them. |  -  |

[[Back to top]](#) [[Back to API list]](../../README.md#documentation-for-api-endpoints) [[Back to Model list]](../../README.md#documentation-for-models) [[Back to README]](../../README.md)

<a id="postsdiscard"></a>
# **PostsDiscard**
> void PostsDiscard (string workspaceId, string postId)

Discard a draft

Deletes a draft. A post scheduled or sent is a conflict: cancel it instead. Needs post:delete, or post:update for the user who created the draft.


### Parameters

| Name | Type | Description | Notes |
|------|------|-------------|-------|
| **workspaceId** | **string** |  |  |
| **postId** | **string** |  |  |

### Return type

void (empty response body)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **204** | &lt;No Content&gt; |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no post with this id. | No workspace with this id is open to the caller. |  -  |
| **409** | The post&#39;s status does not allow this. &#x60;status&#x60; is the status it has. |  -  |

[[Back to top]](#) [[Back to API list]](../../README.md#documentation-for-api-endpoints) [[Back to Model list]](../../README.md#documentation-for-models) [[Back to README]](../../README.md)

<a id="postsdrafts"></a>
# **PostsDrafts**
> DraftPage PostsDrafts (string workspaceId, string cursor = null, string limit = null)

List drafts

Lists the workspace's drafts, newest first, 20 a page unless `limit` (at most 50) says otherwise. Pass the page's `nextCursor` as `cursor` for the next one. Needs post:read.


### Parameters

| Name | Type | Description | Notes |
|------|------|-------------|-------|
| **workspaceId** | **string** |  |  |
| **cursor** | **string** |  | [optional]  |
| **limit** | **string** |  | [optional]  |

### Return type

[**DraftPage**](DraftPage.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | DraftPage |  -  |
| **400** | BadRequest |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | No workspace with this id is open to the caller. |  -  |

[[Back to top]](#) [[Back to API list]](../../README.md#documentation-for-api-endpoints) [[Back to Model list]](../../README.md#documentation-for-models) [[Back to README]](../../README.md)

<a id="postsget"></a>
# **PostsGet**
> Post PostsGet (string workspaceId, string postId)

Get a post

Answers with a post of the workspace. Needs post:read.


### Parameters

| Name | Type | Description | Notes |
|------|------|-------------|-------|
| **workspaceId** | **string** |  |  |
| **postId** | **string** |  |  |

### Return type

[**Post**](Post.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Post |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no post with this id. | No workspace with this id is open to the caller. |  -  |

[[Back to top]](#) [[Back to API list]](../../README.md#documentation-for-api-endpoints) [[Back to Model list]](../../README.md#documentation-for-models) [[Back to README]](../../README.md)

<a id="postslist"></a>
# **PostsList**
> List&lt;Post&gt; PostsList (string workspaceId, string from, string to)

List scheduled posts

Lists the posts scheduled from `from` (included) to `to` (excluded), at most 62 days apart, by scheduled instant, with their channels and how each went. Drafts have no time and are not listed; cancelled posts are, with the time they had. Needs post:read.


### Parameters

| Name | Type | Description | Notes |
|------|------|-------------|-------|
| **workspaceId** | **string** |  |  |
| **from** | **string** |  |  |
| **to** | **string** |  |  |

### Return type

[**List&lt;Post&gt;**](Post.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Success |  -  |
| **400** | The range ends before it starts, or spans more than 62 days. |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | No workspace with this id is open to the caller. |  -  |

[[Back to top]](#) [[Back to API list]](../../README.md#documentation-for-api-endpoints) [[Back to Model list]](../../README.md#documentation-for-models) [[Back to README]](../../README.md)

<a id="postsrepost"></a>
# **PostsRepost**
> Post PostsRepost (string workspaceId, string postId, string targetId)

Repost on a channel

Sends the post again, now, on one channel where it failed or is unconfirmed: a new round, with its own attempts. Check the platform first when it is unconfirmed, as it may be live already. Needs post:schedule.


### Parameters

| Name | Type | Description | Notes |
|------|------|-------------|-------|
| **workspaceId** | **string** |  |  |
| **postId** | **string** |  |  |
| **targetId** | **string** |  |  |

### Return type

[**Post**](Post.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Post |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no post with this id. | No workspace with this id is open to the caller. |  -  |
| **409** | The post&#39;s status does not allow this. &#x60;status&#x60; is the status it has. | The post&#39;s status on that channel does not allow this. &#x60;status&#x60; is the status it has. |  -  |

[[Back to top]](#) [[Back to API list]](../../README.md#documentation-for-api-endpoints) [[Back to Model list]](../../README.md#documentation-for-models) [[Back to README]](../../README.md)

<a id="postsreschedule"></a>
# **PostsReschedule**
> Post PostsReschedule (string workspaceId, string postId, PostSchedule postSchedule)

Reschedule a post

Moves a scheduled post to another instant, or schedules a draft on the channels it has. Moved to another month, or scheduled, it must fit that month's posts in the workspace's plan (PlanLimitReached). Needs post:schedule, and channel:read for a draft.


### Parameters

| Name | Type | Description | Notes |
|------|------|-------------|-------|
| **workspaceId** | **string** |  |  |
| **postId** | **string** |  |  |
| **postSchedule** | [**PostSchedule**](PostSchedule.md) |  |  |

### Return type

[**Post**](Post.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Post |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **402** | The workspace&#39;s plan allows no more of &#x60;limit&#x60;: it has &#x60;allowed&#x60; already. A larger plan, or removing some, makes room. Nothing was changed. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no post with this id. | No workspace with this id is open to the caller. |  -  |
| **409** | The post&#39;s status does not allow this. &#x60;status&#x60; is the status it has. |  -  |
| **422** | The time asked for has passed. A time up to a minute ago publishes now. | The time zone is not an IANA time zone such as Europe/Paris. Offsets such as +01:00 are refused. | The post&#39;s content breaks the rules of its channels&#39; platforms: &#x60;violations&#x60; says how, channel by channel, for its images and videos, media by media, and for its options on a channel, option by option (&#x60;field&#x60;). | Some channels asked for are not connected to the workspace: &#x60;channelIds&#x60; lists them. | Some media attached are not the workspace&#39;s, or not ready to show: &#x60;mediaIds&#x60; lists them. |  -  |

[[Back to top]](#) [[Back to API list]](../../README.md#documentation-for-api-endpoints) [[Back to Model list]](../../README.md#documentation-for-models) [[Back to README]](../../README.md)

<a id="postsschedule"></a>
# **PostsSchedule**
> Post PostsSchedule (string workspaceId, string postId, SchedulePost schedulePost)

Schedule a draft

Schedules a draft on some of the workspace's channels at an instant, kept with the IANA time zone it was chosen in. The content must fit each platform's rules, its media included: file types, sizes, durations, dimensions, alt text, how many videos, and whether images and videos go together. A channel whose platform takes options needs those it requires, as the draft gives them on that channel: a channel the draft was not for has none yet. A time up to a minute ago publishes now. On a server that bills, the posts going out in that month (UTC) must fit the workspace's plan (PlanLimitReached). Needs post:schedule and channel:read, and media:read when it shows media.


### Parameters

| Name | Type | Description | Notes |
|------|------|-------------|-------|
| **workspaceId** | **string** |  |  |
| **postId** | **string** |  |  |
| **schedulePost** | [**SchedulePost**](SchedulePost.md) |  |  |

### Return type

[**Post**](Post.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Post |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **402** | The workspace&#39;s plan allows no more of &#x60;limit&#x60;: it has &#x60;allowed&#x60; already. A larger plan, or removing some, makes room. Nothing was changed. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no post with this id. | No workspace with this id is open to the caller. |  -  |
| **409** | The post&#39;s status does not allow this. &#x60;status&#x60; is the status it has. |  -  |
| **422** | The time asked for has passed. A time up to a minute ago publishes now. | The time zone is not an IANA time zone such as Europe/Paris. Offsets such as +01:00 are refused. | The post&#39;s content breaks the rules of its channels&#39; platforms: &#x60;violations&#x60; says how, channel by channel, for its images and videos, media by media, and for its options on a channel, option by option (&#x60;field&#x60;). | Some channels asked for are not connected to the workspace: &#x60;channelIds&#x60; lists them. | Some media attached are not the workspace&#39;s, or not ready to show: &#x60;mediaIds&#x60; lists them. |  -  |

[[Back to top]](#) [[Back to API list]](../../README.md#documentation-for-api-endpoints) [[Back to Model list]](../../README.md#documentation-for-models) [[Back to README]](../../README.md)

<a id="postsunschedule"></a>
# **PostsUnschedule**
> Post PostsUnschedule (string workspaceId, string postId)

Unschedule a post

Takes a scheduled post back to draft, so its text and media can change: it goes out at no time until it is scheduled again. A post already publishing is a conflict. Needs post:schedule.


### Parameters

| Name | Type | Description | Notes |
|------|------|-------------|-------|
| **workspaceId** | **string** |  |  |
| **postId** | **string** |  |  |

### Return type

[**Post**](Post.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Post |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no post with this id. | No workspace with this id is open to the caller. |  -  |
| **409** | The post&#39;s status does not allow this. &#x60;status&#x60; is the status it has. |  -  |

[[Back to top]](#) [[Back to API list]](../../README.md#documentation-for-api-endpoints) [[Back to Model list]](../../README.md#documentation-for-models) [[Back to README]](../../README.md)

<a id="postsupdate"></a>
# **PostsUpdate**
> Post PostsUpdate (string workspaceId, string postId, PostDraft postDraft)

Update a draft

Replaces a draft's content, channels and options: options left out are removed. A post that is no longer a draft is a conflict. Needs post:update, channel:read, and media:read when it shows media.


### Parameters

| Name | Type | Description | Notes |
|------|------|-------------|-------|
| **workspaceId** | **string** |  |  |
| **postId** | **string** |  |  |
| **postDraft** | [**PostDraft**](PostDraft.md) |  |  |

### Return type

[**Post**](Post.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Post |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no post with this id. | No workspace with this id is open to the caller. |  -  |
| **409** | The post&#39;s status does not allow this. &#x60;status&#x60; is the status it has. |  -  |
| **422** | The post&#39;s content breaks the rules of its channels&#39; platforms: &#x60;violations&#x60; says how, channel by channel, for its images and videos, media by media, and for its options on a channel, option by option (&#x60;field&#x60;). | Some channels asked for are not connected to the workspace: &#x60;channelIds&#x60; lists them. | Some media attached are not the workspace&#39;s, or not ready to show: &#x60;mediaIds&#x60; lists them. |  -  |

[[Back to top]](#) [[Back to API list]](../../README.md#documentation-for-api-endpoints) [[Back to Model list]](../../README.md#documentation-for-models) [[Back to README]](../../README.md)

