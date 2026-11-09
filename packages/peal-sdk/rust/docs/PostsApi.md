# \PostsApi

All URIs are relative to *https://app.peal.social*

Method | HTTP request | Description
------------- | ------------- | -------------
[**posts_attempts**](PostsApi.md#posts_attempts) | **GET** /api/workspaces/{workspaceId}/posts/{postId}/attempts | List a post's attempts
[**posts_cancel**](PostsApi.md#posts_cancel) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/cancel | Cancel a post
[**posts_confirm**](PostsApi.md#posts_confirm) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/targets/{targetId}/confirm | Confirm a post on a channel
[**posts_create**](PostsApi.md#posts_create) | **POST** /api/workspaces/{workspaceId}/posts | Create a draft
[**posts_discard**](PostsApi.md#posts_discard) | **DELETE** /api/workspaces/{workspaceId}/posts/{postId} | Discard a draft
[**posts_drafts**](PostsApi.md#posts_drafts) | **GET** /api/workspaces/{workspaceId}/posts/drafts | List drafts
[**posts_get**](PostsApi.md#posts_get) | **GET** /api/workspaces/{workspaceId}/posts/{postId} | Get a post
[**posts_list**](PostsApi.md#posts_list) | **GET** /api/workspaces/{workspaceId}/posts | List scheduled posts
[**posts_repost**](PostsApi.md#posts_repost) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/targets/{targetId}/repost | Repost on a channel
[**posts_reschedule**](PostsApi.md#posts_reschedule) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/reschedule | Reschedule a post
[**posts_schedule**](PostsApi.md#posts_schedule) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/schedule | Schedule a draft
[**posts_unschedule**](PostsApi.md#posts_unschedule) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/unschedule | Unschedule a post
[**posts_update**](PostsApi.md#posts_update) | **PUT** /api/workspaces/{workspaceId}/posts/{postId} | Update a draft



## posts_attempts

> Vec<models::PublicationAttempt> posts_attempts(workspace_id, post_id)
List a post's attempts

Lists every attempt Peal made at publishing the post, by channel, round and attempt, with how each ended. An attempt still in progress is not listed yet. Needs post:read.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**workspace_id** | **String** |  | [required] |
**post_id** | **String** |  | [required] |

### Return type

[**Vec<models::PublicationAttempt>**](PublicationAttempt.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## posts_cancel

> models::Post posts_cancel(workspace_id, post_id)
Cancel a post

Cancels a draft or a scheduled post. A post already publishing finishes with what its channels did: those not yet sent are cancelled. Needs post:schedule.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**workspace_id** | **String** |  | [required] |
**post_id** | **String** |  | [required] |

### Return type

[**models::Post**](Post.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## posts_confirm

> models::Post posts_confirm(workspace_id, post_id, target_id, target_confirmation)
Confirm a post on a channel

Says what you found on the platform for a post unconfirmed on one channel: `published`, with its address if you have it, or `notPublished`, which fails it there so it can be reposted. Its notifications are marked read. Needs post:schedule.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**workspace_id** | **String** |  | [required] |
**post_id** | **String** |  | [required] |
**target_id** | **String** |  | [required] |
**target_confirmation** | [**TargetConfirmation**](TargetConfirmation.md) |  | [required] |

### Return type

[**models::Post**](Post.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## posts_create

> models::Post posts_create(workspace_id, post_draft)
Create a draft

Creates a draft for some of the workspace's channels, possibly none yet, with options on those whose platform takes them (`TargetOptions`, of the channel's platform). Its media must be the workspace's, and ready. Its text, media and options are checked against each platform's rules when it is scheduled, not before. Needs post:create, channel:read, and media:read when it shows media.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**workspace_id** | **String** |  | [required] |
**post_draft** | [**PostDraft**](PostDraft.md) |  | [required] |

### Return type

[**models::Post**](Post.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## posts_discard

> posts_discard(workspace_id, post_id)
Discard a draft

Deletes a draft. A post scheduled or sent is a conflict: cancel it instead. Needs post:delete, or post:update for the user who created the draft.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**workspace_id** | **String** |  | [required] |
**post_id** | **String** |  | [required] |

### Return type

 (empty response body)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## posts_drafts

> models::DraftPage posts_drafts(workspace_id, cursor, limit)
List drafts

Lists the workspace's drafts, newest first, 20 a page unless `limit` (at most 50) says otherwise. Pass the page's `nextCursor` as `cursor` for the next one. Needs post:read.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**workspace_id** | **String** |  | [required] |
**cursor** | Option<**String**> |  |  |
**limit** | Option<**String**> |  |  |

### Return type

[**models::DraftPage**](DraftPage.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## posts_get

> models::Post posts_get(workspace_id, post_id)
Get a post

Answers with a post of the workspace. Needs post:read.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**workspace_id** | **String** |  | [required] |
**post_id** | **String** |  | [required] |

### Return type

[**models::Post**](Post.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## posts_list

> Vec<models::Post> posts_list(workspace_id, from, to)
List scheduled posts

Lists the posts scheduled from `from` (included) to `to` (excluded), at most 62 days apart, by scheduled instant, with their channels and how each went. Drafts have no time and are not listed; cancelled posts are, with the time they had. Needs post:read.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**workspace_id** | **String** |  | [required] |
**from** | **String** |  | [required] |
**to** | **String** |  | [required] |

### Return type

[**Vec<models::Post>**](Post.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## posts_repost

> models::Post posts_repost(workspace_id, post_id, target_id)
Repost on a channel

Sends the post again, now, on one channel where it failed or is unconfirmed: a new round, with its own attempts. Check the platform first when it is unconfirmed, as it may be live already. Needs post:schedule.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**workspace_id** | **String** |  | [required] |
**post_id** | **String** |  | [required] |
**target_id** | **String** |  | [required] |

### Return type

[**models::Post**](Post.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## posts_reschedule

> models::Post posts_reschedule(workspace_id, post_id, post_schedule)
Reschedule a post

Moves a scheduled post to another instant, or schedules a draft on the channels it has. Moved to another month, or scheduled, it must fit that month's posts in the workspace's plan (PlanLimitReached). Needs post:schedule, and channel:read for a draft.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**workspace_id** | **String** |  | [required] |
**post_id** | **String** |  | [required] |
**post_schedule** | [**PostSchedule**](PostSchedule.md) |  | [required] |

### Return type

[**models::Post**](Post.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## posts_schedule

> models::Post posts_schedule(workspace_id, post_id, schedule_post)
Schedule a draft

Schedules a draft on some of the workspace's channels at an instant, kept with the IANA time zone it was chosen in. The content must fit each platform's rules, its media included: file types, sizes, durations, dimensions, alt text, how many videos, and whether images and videos go together. A channel whose platform takes options needs those it requires, as the draft gives them on that channel: a channel the draft was not for has none yet. A time up to a minute ago publishes now. On a server that bills, the posts going out in that month (UTC) must fit the workspace's plan (PlanLimitReached). Needs post:schedule and channel:read, and media:read when it shows media.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**workspace_id** | **String** |  | [required] |
**post_id** | **String** |  | [required] |
**schedule_post** | [**SchedulePost**](SchedulePost.md) |  | [required] |

### Return type

[**models::Post**](Post.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## posts_unschedule

> models::Post posts_unschedule(workspace_id, post_id)
Unschedule a post

Takes a scheduled post back to draft, so its text and media can change: it goes out at no time until it is scheduled again. A post already publishing is a conflict. Needs post:schedule.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**workspace_id** | **String** |  | [required] |
**post_id** | **String** |  | [required] |

### Return type

[**models::Post**](Post.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## posts_update

> models::Post posts_update(workspace_id, post_id, post_draft)
Update a draft

Replaces a draft's content, channels and options: options left out are removed. A post that is no longer a draft is a conflict. Needs post:update, channel:read, and media:read when it shows media.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**workspace_id** | **String** |  | [required] |
**post_id** | **String** |  | [required] |
**post_draft** | [**PostDraft**](PostDraft.md) |  | [required] |

### Return type

[**models::Post**](Post.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

