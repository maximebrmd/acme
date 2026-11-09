# PostsApi

All URIs are relative to *https://app.peal.social*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**postsAttempts**](PostsApi.md#postsattempts) | **GET** /api/workspaces/{workspaceId}/posts/{postId}/attempts | List a post\&#39;s attempts |
| [**postsCancel**](PostsApi.md#postscancel) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/cancel | Cancel a post |
| [**postsConfirm**](PostsApi.md#postsconfirm) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/targets/{targetId}/confirm | Confirm a post on a channel |
| [**postsCreate**](PostsApi.md#postscreate) | **POST** /api/workspaces/{workspaceId}/posts | Create a draft |
| [**postsDiscard**](PostsApi.md#postsdiscard) | **DELETE** /api/workspaces/{workspaceId}/posts/{postId} | Discard a draft |
| [**postsDrafts**](PostsApi.md#postsdrafts) | **GET** /api/workspaces/{workspaceId}/posts/drafts | List drafts |
| [**postsGet**](PostsApi.md#postsget) | **GET** /api/workspaces/{workspaceId}/posts/{postId} | Get a post |
| [**postsList**](PostsApi.md#postslist) | **GET** /api/workspaces/{workspaceId}/posts | List scheduled posts |
| [**postsRepost**](PostsApi.md#postsrepost) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/targets/{targetId}/repost | Repost on a channel |
| [**postsReschedule**](PostsApi.md#postsreschedule) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/reschedule | Reschedule a post |
| [**postsSchedule**](PostsApi.md#postsschedule) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/schedule | Schedule a draft |
| [**postsUnschedule**](PostsApi.md#postsunschedule) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/unschedule | Unschedule a post |
| [**postsUpdate**](PostsApi.md#postsupdate) | **PUT** /api/workspaces/{workspaceId}/posts/{postId} | Update a draft |



## postsAttempts

> Array&lt;PublicationAttempt&gt; postsAttempts(workspaceId, postId)

List a post\&#39;s attempts

Lists every attempt Peal made at publishing the post, by channel, round and attempt, with how each ended. An attempt still in progress is not listed yet. Needs post:read.

### Example

```ts
import {
  Configuration,
  PostsApi,
} from 'peal';
import type { PostsAttemptsRequest } from 'peal';

async function example() {
  console.log("🚀 Testing peal SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new PostsApi(config);

  const body = {
    // string
    workspaceId: workspaceId_example,
    // string
    postId: postId_example,
  } satisfies PostsAttemptsRequest;

  try {
    const data = await api.postsAttempts(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | `string` |  | [Defaults to `undefined`] |
| **postId** | `string` |  | [Defaults to `undefined`] |

### Return type

[**Array&lt;PublicationAttempt&gt;**](PublicationAttempt.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Success |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no post with this id. | No workspace with this id is open to the caller. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## postsCancel

> Post postsCancel(workspaceId, postId)

Cancel a post

Cancels a draft or a scheduled post. A post already publishing finishes with what its channels did: those not yet sent are cancelled. Needs post:schedule.

### Example

```ts
import {
  Configuration,
  PostsApi,
} from 'peal';
import type { PostsCancelRequest } from 'peal';

async function example() {
  console.log("🚀 Testing peal SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new PostsApi(config);

  const body = {
    // string
    workspaceId: workspaceId_example,
    // string
    postId: postId_example,
  } satisfies PostsCancelRequest;

  try {
    const data = await api.postsCancel(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | `string` |  | [Defaults to `undefined`] |
| **postId** | `string` |  | [Defaults to `undefined`] |

### Return type

[**Post**](Post.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Post |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no post with this id. | No workspace with this id is open to the caller. |  -  |
| **409** | The post\&#39;s status does not allow this. &#x60;status&#x60; is the status it has. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## postsConfirm

> Post postsConfirm(workspaceId, postId, targetId, targetConfirmation)

Confirm a post on a channel

Says what you found on the platform for a post unconfirmed on one channel: &#x60;published&#x60;, with its address if you have it, or &#x60;notPublished&#x60;, which fails it there so it can be reposted. Its notifications are marked read. Needs post:schedule.

### Example

```ts
import {
  Configuration,
  PostsApi,
} from 'peal';
import type { PostsConfirmRequest } from 'peal';

async function example() {
  console.log("🚀 Testing peal SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new PostsApi(config);

  const body = {
    // string
    workspaceId: workspaceId_example,
    // string
    postId: postId_example,
    // string
    targetId: targetId_example,
    // TargetConfirmation
    targetConfirmation: ...,
  } satisfies PostsConfirmRequest;

  try {
    const data = await api.postsConfirm(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | `string` |  | [Defaults to `undefined`] |
| **postId** | `string` |  | [Defaults to `undefined`] |
| **targetId** | `string` |  | [Defaults to `undefined`] |
| **targetConfirmation** | [TargetConfirmation](TargetConfirmation.md) |  | |

### Return type

[**Post**](Post.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Post |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no post with this id. | No workspace with this id is open to the caller. |  -  |
| **409** | The post\&#39;s status does not allow this. &#x60;status&#x60; is the status it has. | The post\&#39;s status on that channel does not allow this. &#x60;status&#x60; is the status it has. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## postsCreate

> Post postsCreate(workspaceId, postDraft)

Create a draft

Creates a draft for some of the workspace\&#39;s channels, possibly none yet, with options on those whose platform takes them (&#x60;TargetOptions&#x60;, of the channel\&#39;s platform). Its media must be the workspace\&#39;s, and ready. Its text, media and options are checked against each platform\&#39;s rules when it is scheduled, not before. Needs post:create, channel:read, and media:read when it shows media.

### Example

```ts
import {
  Configuration,
  PostsApi,
} from 'peal';
import type { PostsCreateRequest } from 'peal';

async function example() {
  console.log("🚀 Testing peal SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new PostsApi(config);

  const body = {
    // string
    workspaceId: workspaceId_example,
    // PostDraft
    postDraft: ...,
  } satisfies PostsCreateRequest;

  try {
    const data = await api.postsCreate(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | `string` |  | [Defaults to `undefined`] |
| **postDraft** | [PostDraft](PostDraft.md) |  | |

### Return type

[**Post**](Post.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | Post |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | No workspace with this id is open to the caller. |  -  |
| **422** | The post\&#39;s content breaks the rules of its channels\&#39; platforms: &#x60;violations&#x60; says how, channel by channel, for its images and videos, media by media, and for its options on a channel, option by option (&#x60;field&#x60;). | Some channels asked for are not connected to the workspace: &#x60;channelIds&#x60; lists them. | Some media attached are not the workspace\&#39;s, or not ready to show: &#x60;mediaIds&#x60; lists them. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## postsDiscard

> postsDiscard(workspaceId, postId)

Discard a draft

Deletes a draft. A post scheduled or sent is a conflict: cancel it instead. Needs post:delete, or post:update for the user who created the draft.

### Example

```ts
import {
  Configuration,
  PostsApi,
} from 'peal';
import type { PostsDiscardRequest } from 'peal';

async function example() {
  console.log("🚀 Testing peal SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new PostsApi(config);

  const body = {
    // string
    workspaceId: workspaceId_example,
    // string
    postId: postId_example,
  } satisfies PostsDiscardRequest;

  try {
    const data = await api.postsDiscard(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | `string` |  | [Defaults to `undefined`] |
| **postId** | `string` |  | [Defaults to `undefined`] |

### Return type

`void` (Empty response body)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **204** | &lt;No Content&gt; |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no post with this id. | No workspace with this id is open to the caller. |  -  |
| **409** | The post\&#39;s status does not allow this. &#x60;status&#x60; is the status it has. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## postsDrafts

> DraftPage postsDrafts(workspaceId, cursor, limit)

List drafts

Lists the workspace\&#39;s drafts, newest first, 20 a page unless &#x60;limit&#x60; (at most 50) says otherwise. Pass the page\&#39;s &#x60;nextCursor&#x60; as &#x60;cursor&#x60; for the next one. Needs post:read.

### Example

```ts
import {
  Configuration,
  PostsApi,
} from 'peal';
import type { PostsDraftsRequest } from 'peal';

async function example() {
  console.log("🚀 Testing peal SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new PostsApi(config);

  const body = {
    // string
    workspaceId: workspaceId_example,
    // string (optional)
    cursor: cursor_example,
    // string (optional)
    limit: limit_example,
  } satisfies PostsDraftsRequest;

  try {
    const data = await api.postsDrafts(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | `string` |  | [Defaults to `undefined`] |
| **cursor** | `string` |  | [Optional] [Defaults to `undefined`] |
| **limit** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**DraftPage**](DraftPage.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | DraftPage |  -  |
| **400** | BadRequest |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | No workspace with this id is open to the caller. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## postsGet

> Post postsGet(workspaceId, postId)

Get a post

Answers with a post of the workspace. Needs post:read.

### Example

```ts
import {
  Configuration,
  PostsApi,
} from 'peal';
import type { PostsGetRequest } from 'peal';

async function example() {
  console.log("🚀 Testing peal SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new PostsApi(config);

  const body = {
    // string
    workspaceId: workspaceId_example,
    // string
    postId: postId_example,
  } satisfies PostsGetRequest;

  try {
    const data = await api.postsGet(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | `string` |  | [Defaults to `undefined`] |
| **postId** | `string` |  | [Defaults to `undefined`] |

### Return type

[**Post**](Post.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Post |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no post with this id. | No workspace with this id is open to the caller. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## postsList

> Array&lt;Post&gt; postsList(workspaceId, from, to)

List scheduled posts

Lists the posts scheduled from &#x60;from&#x60; (included) to &#x60;to&#x60; (excluded), at most 62 days apart, by scheduled instant, with their channels and how each went. Drafts have no time and are not listed; cancelled posts are, with the time they had. Needs post:read.

### Example

```ts
import {
  Configuration,
  PostsApi,
} from 'peal';
import type { PostsListRequest } from 'peal';

async function example() {
  console.log("🚀 Testing peal SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new PostsApi(config);

  const body = {
    // string
    workspaceId: workspaceId_example,
    // string
    from: from_example,
    // string
    to: to_example,
  } satisfies PostsListRequest;

  try {
    const data = await api.postsList(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | `string` |  | [Defaults to `undefined`] |
| **from** | `string` |  | [Defaults to `undefined`] |
| **to** | `string` |  | [Defaults to `undefined`] |

### Return type

[**Array&lt;Post&gt;**](Post.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Success |  -  |
| **400** | The range ends before it starts, or spans more than 62 days. |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | No workspace with this id is open to the caller. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## postsRepost

> Post postsRepost(workspaceId, postId, targetId)

Repost on a channel

Sends the post again, now, on one channel where it failed or is unconfirmed: a new round, with its own attempts. Check the platform first when it is unconfirmed, as it may be live already. Needs post:schedule.

### Example

```ts
import {
  Configuration,
  PostsApi,
} from 'peal';
import type { PostsRepostRequest } from 'peal';

async function example() {
  console.log("🚀 Testing peal SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new PostsApi(config);

  const body = {
    // string
    workspaceId: workspaceId_example,
    // string
    postId: postId_example,
    // string
    targetId: targetId_example,
  } satisfies PostsRepostRequest;

  try {
    const data = await api.postsRepost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | `string` |  | [Defaults to `undefined`] |
| **postId** | `string` |  | [Defaults to `undefined`] |
| **targetId** | `string` |  | [Defaults to `undefined`] |

### Return type

[**Post**](Post.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Post |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no post with this id. | No workspace with this id is open to the caller. |  -  |
| **409** | The post\&#39;s status does not allow this. &#x60;status&#x60; is the status it has. | The post\&#39;s status on that channel does not allow this. &#x60;status&#x60; is the status it has. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## postsReschedule

> Post postsReschedule(workspaceId, postId, postSchedule)

Reschedule a post

Moves a scheduled post to another instant, or schedules a draft on the channels it has. Moved to another month, or scheduled, it must fit that month\&#39;s posts in the workspace\&#39;s plan (PlanLimitReached). Needs post:schedule, and channel:read for a draft.

### Example

```ts
import {
  Configuration,
  PostsApi,
} from 'peal';
import type { PostsRescheduleRequest } from 'peal';

async function example() {
  console.log("🚀 Testing peal SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new PostsApi(config);

  const body = {
    // string
    workspaceId: workspaceId_example,
    // string
    postId: postId_example,
    // PostSchedule
    postSchedule: ...,
  } satisfies PostsRescheduleRequest;

  try {
    const data = await api.postsReschedule(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | `string` |  | [Defaults to `undefined`] |
| **postId** | `string` |  | [Defaults to `undefined`] |
| **postSchedule** | [PostSchedule](PostSchedule.md) |  | |

### Return type

[**Post**](Post.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Post |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **402** | The workspace\&#39;s plan allows no more of &#x60;limit&#x60;: it has &#x60;allowed&#x60; already. A larger plan, or removing some, makes room. Nothing was changed. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no post with this id. | No workspace with this id is open to the caller. |  -  |
| **409** | The post\&#39;s status does not allow this. &#x60;status&#x60; is the status it has. |  -  |
| **422** | The time asked for has passed. A time up to a minute ago publishes now. | The time zone is not an IANA time zone such as Europe/Paris. Offsets such as +01:00 are refused. | The post\&#39;s content breaks the rules of its channels\&#39; platforms: &#x60;violations&#x60; says how, channel by channel, for its images and videos, media by media, and for its options on a channel, option by option (&#x60;field&#x60;). | Some channels asked for are not connected to the workspace: &#x60;channelIds&#x60; lists them. | Some media attached are not the workspace\&#39;s, or not ready to show: &#x60;mediaIds&#x60; lists them. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## postsSchedule

> Post postsSchedule(workspaceId, postId, schedulePost)

Schedule a draft

Schedules a draft on some of the workspace\&#39;s channels at an instant, kept with the IANA time zone it was chosen in. The content must fit each platform\&#39;s rules, its media included: file types, sizes, durations, dimensions, alt text, how many videos, and whether images and videos go together. A channel whose platform takes options needs those it requires, as the draft gives them on that channel: a channel the draft was not for has none yet. A time up to a minute ago publishes now. On a server that bills, the posts going out in that month (UTC) must fit the workspace\&#39;s plan (PlanLimitReached). Needs post:schedule and channel:read, and media:read when it shows media.

### Example

```ts
import {
  Configuration,
  PostsApi,
} from 'peal';
import type { PostsScheduleRequest } from 'peal';

async function example() {
  console.log("🚀 Testing peal SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new PostsApi(config);

  const body = {
    // string
    workspaceId: workspaceId_example,
    // string
    postId: postId_example,
    // SchedulePost
    schedulePost: ...,
  } satisfies PostsScheduleRequest;

  try {
    const data = await api.postsSchedule(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | `string` |  | [Defaults to `undefined`] |
| **postId** | `string` |  | [Defaults to `undefined`] |
| **schedulePost** | [SchedulePost](SchedulePost.md) |  | |

### Return type

[**Post**](Post.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Post |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **402** | The workspace\&#39;s plan allows no more of &#x60;limit&#x60;: it has &#x60;allowed&#x60; already. A larger plan, or removing some, makes room. Nothing was changed. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no post with this id. | No workspace with this id is open to the caller. |  -  |
| **409** | The post\&#39;s status does not allow this. &#x60;status&#x60; is the status it has. |  -  |
| **422** | The time asked for has passed. A time up to a minute ago publishes now. | The time zone is not an IANA time zone such as Europe/Paris. Offsets such as +01:00 are refused. | The post\&#39;s content breaks the rules of its channels\&#39; platforms: &#x60;violations&#x60; says how, channel by channel, for its images and videos, media by media, and for its options on a channel, option by option (&#x60;field&#x60;). | Some channels asked for are not connected to the workspace: &#x60;channelIds&#x60; lists them. | Some media attached are not the workspace\&#39;s, or not ready to show: &#x60;mediaIds&#x60; lists them. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## postsUnschedule

> Post postsUnschedule(workspaceId, postId)

Unschedule a post

Takes a scheduled post back to draft, so its text and media can change: it goes out at no time until it is scheduled again. A post already publishing is a conflict. Needs post:schedule.

### Example

```ts
import {
  Configuration,
  PostsApi,
} from 'peal';
import type { PostsUnscheduleRequest } from 'peal';

async function example() {
  console.log("🚀 Testing peal SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new PostsApi(config);

  const body = {
    // string
    workspaceId: workspaceId_example,
    // string
    postId: postId_example,
  } satisfies PostsUnscheduleRequest;

  try {
    const data = await api.postsUnschedule(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | `string` |  | [Defaults to `undefined`] |
| **postId** | `string` |  | [Defaults to `undefined`] |

### Return type

[**Post**](Post.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Post |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no post with this id. | No workspace with this id is open to the caller. |  -  |
| **409** | The post\&#39;s status does not allow this. &#x60;status&#x60; is the status it has. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## postsUpdate

> Post postsUpdate(workspaceId, postId, postDraft)

Update a draft

Replaces a draft\&#39;s content, channels and options: options left out are removed. A post that is no longer a draft is a conflict. Needs post:update, channel:read, and media:read when it shows media.

### Example

```ts
import {
  Configuration,
  PostsApi,
} from 'peal';
import type { PostsUpdateRequest } from 'peal';

async function example() {
  console.log("🚀 Testing peal SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new PostsApi(config);

  const body = {
    // string
    workspaceId: workspaceId_example,
    // string
    postId: postId_example,
    // PostDraft
    postDraft: ...,
  } satisfies PostsUpdateRequest;

  try {
    const data = await api.postsUpdate(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | `string` |  | [Defaults to `undefined`] |
| **postId** | `string` |  | [Defaults to `undefined`] |
| **postDraft** | [PostDraft](PostDraft.md) |  | |

### Return type

[**Post**](Post.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Post |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no post with this id. | No workspace with this id is open to the caller. |  -  |
| **409** | The post\&#39;s status does not allow this. &#x60;status&#x60; is the status it has. |  -  |
| **422** | The post\&#39;s content breaks the rules of its channels\&#39; platforms: &#x60;violations&#x60; says how, channel by channel, for its images and videos, media by media, and for its options on a channel, option by option (&#x60;field&#x60;). | Some channels asked for are not connected to the workspace: &#x60;channelIds&#x60; lists them. | Some media attached are not the workspace\&#39;s, or not ready to show: &#x60;mediaIds&#x60; lists them. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

