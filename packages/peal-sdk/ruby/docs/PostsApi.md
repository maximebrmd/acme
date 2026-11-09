# Peal::PostsApi

All URIs are relative to *https://app.peal.social*

| Method | HTTP request | Description |
| ------ | ------------ | ----------- |
| [**posts_attempts**](PostsApi.md#posts_attempts) | **GET** /api/workspaces/{workspaceId}/posts/{postId}/attempts | List a post&#39;s attempts |
| [**posts_cancel**](PostsApi.md#posts_cancel) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/cancel | Cancel a post |
| [**posts_confirm**](PostsApi.md#posts_confirm) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/targets/{targetId}/confirm | Confirm a post on a channel |
| [**posts_create**](PostsApi.md#posts_create) | **POST** /api/workspaces/{workspaceId}/posts | Create a draft |
| [**posts_discard**](PostsApi.md#posts_discard) | **DELETE** /api/workspaces/{workspaceId}/posts/{postId} | Discard a draft |
| [**posts_drafts**](PostsApi.md#posts_drafts) | **GET** /api/workspaces/{workspaceId}/posts/drafts | List drafts |
| [**posts_get**](PostsApi.md#posts_get) | **GET** /api/workspaces/{workspaceId}/posts/{postId} | Get a post |
| [**posts_list**](PostsApi.md#posts_list) | **GET** /api/workspaces/{workspaceId}/posts | List scheduled posts |
| [**posts_repost**](PostsApi.md#posts_repost) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/targets/{targetId}/repost | Repost on a channel |
| [**posts_reschedule**](PostsApi.md#posts_reschedule) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/reschedule | Reschedule a post |
| [**posts_schedule**](PostsApi.md#posts_schedule) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/schedule | Schedule a draft |
| [**posts_unschedule**](PostsApi.md#posts_unschedule) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/unschedule | Unschedule a post |
| [**posts_update**](PostsApi.md#posts_update) | **PUT** /api/workspaces/{workspaceId}/posts/{postId} | Update a draft |


## posts_attempts

> <Array<PublicationAttempt>> posts_attempts(workspace_id, post_id)

List a post's attempts

Lists every attempt Peal made at publishing the post, by channel, round and attempt, with how each ended. An attempt still in progress is not listed yet. Needs post:read.

### Examples

```ruby
require 'time'
require 'peal'
# setup authorization
Peal.configure do |config|
  # Configure Bearer authorization: bearer
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = Peal::PostsApi.new
workspace_id = 'workspace_id_example' # String | 
post_id = 'post_id_example' # String | 

begin
  # List a post's attempts
  result = api_instance.posts_attempts(workspace_id, post_id)
  p result
rescue Peal::ApiError => e
  puts "Error when calling PostsApi->posts_attempts: #{e}"
end
```

#### Using the posts_attempts_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<Array<PublicationAttempt>>, Integer, Hash)> posts_attempts_with_http_info(workspace_id, post_id)

```ruby
begin
  # List a post's attempts
  data, status_code, headers = api_instance.posts_attempts_with_http_info(workspace_id, post_id)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <Array<PublicationAttempt>>
rescue Peal::ApiError => e
  puts "Error when calling PostsApi->posts_attempts_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **workspace_id** | **String** |  |  |
| **post_id** | **String** |  |  |

### Return type

[**Array&lt;PublicationAttempt&gt;**](PublicationAttempt.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## posts_cancel

> <Post> posts_cancel(workspace_id, post_id)

Cancel a post

Cancels a draft or a scheduled post. A post already publishing finishes with what its channels did: those not yet sent are cancelled. Needs post:schedule.

### Examples

```ruby
require 'time'
require 'peal'
# setup authorization
Peal.configure do |config|
  # Configure Bearer authorization: bearer
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = Peal::PostsApi.new
workspace_id = 'workspace_id_example' # String | 
post_id = 'post_id_example' # String | 

begin
  # Cancel a post
  result = api_instance.posts_cancel(workspace_id, post_id)
  p result
rescue Peal::ApiError => e
  puts "Error when calling PostsApi->posts_cancel: #{e}"
end
```

#### Using the posts_cancel_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<Post>, Integer, Hash)> posts_cancel_with_http_info(workspace_id, post_id)

```ruby
begin
  # Cancel a post
  data, status_code, headers = api_instance.posts_cancel_with_http_info(workspace_id, post_id)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <Post>
rescue Peal::ApiError => e
  puts "Error when calling PostsApi->posts_cancel_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **workspace_id** | **String** |  |  |
| **post_id** | **String** |  |  |

### Return type

[**Post**](Post.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## posts_confirm

> <Post> posts_confirm(workspace_id, post_id, target_id, target_confirmation)

Confirm a post on a channel

Says what you found on the platform for a post unconfirmed on one channel: `published`, with its address if you have it, or `notPublished`, which fails it there so it can be reposted. Its notifications are marked read. Needs post:schedule.

### Examples

```ruby
require 'time'
require 'peal'
# setup authorization
Peal.configure do |config|
  # Configure Bearer authorization: bearer
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = Peal::PostsApi.new
workspace_id = 'workspace_id_example' # String | 
post_id = 'post_id_example' # String | 
target_id = 'target_id_example' # String | 
target_confirmation = Peal::TargetConfirmation.new({_tag: 'notPublished', permalink: 'permalink_example'}) # TargetConfirmation | 

begin
  # Confirm a post on a channel
  result = api_instance.posts_confirm(workspace_id, post_id, target_id, target_confirmation)
  p result
rescue Peal::ApiError => e
  puts "Error when calling PostsApi->posts_confirm: #{e}"
end
```

#### Using the posts_confirm_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<Post>, Integer, Hash)> posts_confirm_with_http_info(workspace_id, post_id, target_id, target_confirmation)

```ruby
begin
  # Confirm a post on a channel
  data, status_code, headers = api_instance.posts_confirm_with_http_info(workspace_id, post_id, target_id, target_confirmation)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <Post>
rescue Peal::ApiError => e
  puts "Error when calling PostsApi->posts_confirm_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **workspace_id** | **String** |  |  |
| **post_id** | **String** |  |  |
| **target_id** | **String** |  |  |
| **target_confirmation** | [**TargetConfirmation**](TargetConfirmation.md) |  |  |

### Return type

[**Post**](Post.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json


## posts_create

> <Post> posts_create(workspace_id, post_draft)

Create a draft

Creates a draft for some of the workspace's channels, possibly none yet, with options on those whose platform takes them (`TargetOptions`, of the channel's platform). Its media must be the workspace's, and ready. Its text, media and options are checked against each platform's rules when it is scheduled, not before. Needs post:create, channel:read, and media:read when it shows media.

### Examples

```ruby
require 'time'
require 'peal'
# setup authorization
Peal.configure do |config|
  # Configure Bearer authorization: bearer
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = Peal::PostsApi.new
workspace_id = 'workspace_id_example' # String | 
post_draft = Peal::PostDraft.new({channel_ids: ['channel_ids_example'], content: Peal::PostContent.new({media: [Peal::MediaAttachment.new({alt_text: 'alt_text_example', media_id: 'media_id_example'})], overrides: [Peal::TextOverride.new({channel_id: 'channel_id_example', text: 'text_example'})], text: 'text_example'})}) # PostDraft | 

begin
  # Create a draft
  result = api_instance.posts_create(workspace_id, post_draft)
  p result
rescue Peal::ApiError => e
  puts "Error when calling PostsApi->posts_create: #{e}"
end
```

#### Using the posts_create_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<Post>, Integer, Hash)> posts_create_with_http_info(workspace_id, post_draft)

```ruby
begin
  # Create a draft
  data, status_code, headers = api_instance.posts_create_with_http_info(workspace_id, post_draft)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <Post>
rescue Peal::ApiError => e
  puts "Error when calling PostsApi->posts_create_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **workspace_id** | **String** |  |  |
| **post_draft** | [**PostDraft**](PostDraft.md) |  |  |

### Return type

[**Post**](Post.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json


## posts_discard

> posts_discard(workspace_id, post_id)

Discard a draft

Deletes a draft. A post scheduled or sent is a conflict: cancel it instead. Needs post:delete, or post:update for the user who created the draft.

### Examples

```ruby
require 'time'
require 'peal'
# setup authorization
Peal.configure do |config|
  # Configure Bearer authorization: bearer
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = Peal::PostsApi.new
workspace_id = 'workspace_id_example' # String | 
post_id = 'post_id_example' # String | 

begin
  # Discard a draft
  api_instance.posts_discard(workspace_id, post_id)
rescue Peal::ApiError => e
  puts "Error when calling PostsApi->posts_discard: #{e}"
end
```

#### Using the posts_discard_with_http_info variant

This returns an Array which contains the response data (`nil` in this case), status code and headers.

> <Array(nil, Integer, Hash)> posts_discard_with_http_info(workspace_id, post_id)

```ruby
begin
  # Discard a draft
  data, status_code, headers = api_instance.posts_discard_with_http_info(workspace_id, post_id)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => nil
rescue Peal::ApiError => e
  puts "Error when calling PostsApi->posts_discard_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **workspace_id** | **String** |  |  |
| **post_id** | **String** |  |  |

### Return type

nil (empty response body)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## posts_drafts

> <DraftPage> posts_drafts(workspace_id, opts)

List drafts

Lists the workspace's drafts, newest first, 20 a page unless `limit` (at most 50) says otherwise. Pass the page's `nextCursor` as `cursor` for the next one. Needs post:read.

### Examples

```ruby
require 'time'
require 'peal'
# setup authorization
Peal.configure do |config|
  # Configure Bearer authorization: bearer
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = Peal::PostsApi.new
workspace_id = 'workspace_id_example' # String | 
opts = {
  cursor: 'cursor_example', # String | 
  limit: 'limit_example' # String | 
}

begin
  # List drafts
  result = api_instance.posts_drafts(workspace_id, opts)
  p result
rescue Peal::ApiError => e
  puts "Error when calling PostsApi->posts_drafts: #{e}"
end
```

#### Using the posts_drafts_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<DraftPage>, Integer, Hash)> posts_drafts_with_http_info(workspace_id, opts)

```ruby
begin
  # List drafts
  data, status_code, headers = api_instance.posts_drafts_with_http_info(workspace_id, opts)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <DraftPage>
rescue Peal::ApiError => e
  puts "Error when calling PostsApi->posts_drafts_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **workspace_id** | **String** |  |  |
| **cursor** | **String** |  | [optional] |
| **limit** | **String** |  | [optional] |

### Return type

[**DraftPage**](DraftPage.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## posts_get

> <Post> posts_get(workspace_id, post_id)

Get a post

Answers with a post of the workspace. Needs post:read.

### Examples

```ruby
require 'time'
require 'peal'
# setup authorization
Peal.configure do |config|
  # Configure Bearer authorization: bearer
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = Peal::PostsApi.new
workspace_id = 'workspace_id_example' # String | 
post_id = 'post_id_example' # String | 

begin
  # Get a post
  result = api_instance.posts_get(workspace_id, post_id)
  p result
rescue Peal::ApiError => e
  puts "Error when calling PostsApi->posts_get: #{e}"
end
```

#### Using the posts_get_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<Post>, Integer, Hash)> posts_get_with_http_info(workspace_id, post_id)

```ruby
begin
  # Get a post
  data, status_code, headers = api_instance.posts_get_with_http_info(workspace_id, post_id)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <Post>
rescue Peal::ApiError => e
  puts "Error when calling PostsApi->posts_get_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **workspace_id** | **String** |  |  |
| **post_id** | **String** |  |  |

### Return type

[**Post**](Post.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## posts_list

> <Array<Post>> posts_list(workspace_id, from, to)

List scheduled posts

Lists the posts scheduled from `from` (included) to `to` (excluded), at most 62 days apart, by scheduled instant, with their channels and how each went. Drafts have no time and are not listed; cancelled posts are, with the time they had. Needs post:read.

### Examples

```ruby
require 'time'
require 'peal'
# setup authorization
Peal.configure do |config|
  # Configure Bearer authorization: bearer
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = Peal::PostsApi.new
workspace_id = 'workspace_id_example' # String | 
from = 'from_example' # String | 
to = 'to_example' # String | 

begin
  # List scheduled posts
  result = api_instance.posts_list(workspace_id, from, to)
  p result
rescue Peal::ApiError => e
  puts "Error when calling PostsApi->posts_list: #{e}"
end
```

#### Using the posts_list_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<Array<Post>>, Integer, Hash)> posts_list_with_http_info(workspace_id, from, to)

```ruby
begin
  # List scheduled posts
  data, status_code, headers = api_instance.posts_list_with_http_info(workspace_id, from, to)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <Array<Post>>
rescue Peal::ApiError => e
  puts "Error when calling PostsApi->posts_list_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **workspace_id** | **String** |  |  |
| **from** | **String** |  |  |
| **to** | **String** |  |  |

### Return type

[**Array&lt;Post&gt;**](Post.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## posts_repost

> <Post> posts_repost(workspace_id, post_id, target_id)

Repost on a channel

Sends the post again, now, on one channel where it failed or is unconfirmed: a new round, with its own attempts. Check the platform first when it is unconfirmed, as it may be live already. Needs post:schedule.

### Examples

```ruby
require 'time'
require 'peal'
# setup authorization
Peal.configure do |config|
  # Configure Bearer authorization: bearer
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = Peal::PostsApi.new
workspace_id = 'workspace_id_example' # String | 
post_id = 'post_id_example' # String | 
target_id = 'target_id_example' # String | 

begin
  # Repost on a channel
  result = api_instance.posts_repost(workspace_id, post_id, target_id)
  p result
rescue Peal::ApiError => e
  puts "Error when calling PostsApi->posts_repost: #{e}"
end
```

#### Using the posts_repost_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<Post>, Integer, Hash)> posts_repost_with_http_info(workspace_id, post_id, target_id)

```ruby
begin
  # Repost on a channel
  data, status_code, headers = api_instance.posts_repost_with_http_info(workspace_id, post_id, target_id)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <Post>
rescue Peal::ApiError => e
  puts "Error when calling PostsApi->posts_repost_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **workspace_id** | **String** |  |  |
| **post_id** | **String** |  |  |
| **target_id** | **String** |  |  |

### Return type

[**Post**](Post.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## posts_reschedule

> <Post> posts_reschedule(workspace_id, post_id, post_schedule)

Reschedule a post

Moves a scheduled post to another instant, or schedules a draft on the channels it has. Moved to another month, or scheduled, it must fit that month's posts in the workspace's plan (PlanLimitReached). Needs post:schedule, and channel:read for a draft.

### Examples

```ruby
require 'time'
require 'peal'
# setup authorization
Peal.configure do |config|
  # Configure Bearer authorization: bearer
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = Peal::PostsApi.new
workspace_id = 'workspace_id_example' # String | 
post_id = 'post_id_example' # String | 
post_schedule = Peal::PostSchedule.new({at: 'at_example', time_zone: 'time_zone_example'}) # PostSchedule | 

begin
  # Reschedule a post
  result = api_instance.posts_reschedule(workspace_id, post_id, post_schedule)
  p result
rescue Peal::ApiError => e
  puts "Error when calling PostsApi->posts_reschedule: #{e}"
end
```

#### Using the posts_reschedule_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<Post>, Integer, Hash)> posts_reschedule_with_http_info(workspace_id, post_id, post_schedule)

```ruby
begin
  # Reschedule a post
  data, status_code, headers = api_instance.posts_reschedule_with_http_info(workspace_id, post_id, post_schedule)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <Post>
rescue Peal::ApiError => e
  puts "Error when calling PostsApi->posts_reschedule_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **workspace_id** | **String** |  |  |
| **post_id** | **String** |  |  |
| **post_schedule** | [**PostSchedule**](PostSchedule.md) |  |  |

### Return type

[**Post**](Post.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json


## posts_schedule

> <Post> posts_schedule(workspace_id, post_id, schedule_post)

Schedule a draft

Schedules a draft on some of the workspace's channels at an instant, kept with the IANA time zone it was chosen in. The content must fit each platform's rules, its media included: file types, sizes, durations, dimensions, alt text, how many videos, and whether images and videos go together. A channel whose platform takes options needs those it requires, as the draft gives them on that channel: a channel the draft was not for has none yet. A time up to a minute ago publishes now. On a server that bills, the posts going out in that month (UTC) must fit the workspace's plan (PlanLimitReached). Needs post:schedule and channel:read, and media:read when it shows media.

### Examples

```ruby
require 'time'
require 'peal'
# setup authorization
Peal.configure do |config|
  # Configure Bearer authorization: bearer
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = Peal::PostsApi.new
workspace_id = 'workspace_id_example' # String | 
post_id = 'post_id_example' # String | 
schedule_post = Peal::SchedulePost.new({at: 'at_example', channel_ids: ['channel_ids_example'], time_zone: 'time_zone_example'}) # SchedulePost | 

begin
  # Schedule a draft
  result = api_instance.posts_schedule(workspace_id, post_id, schedule_post)
  p result
rescue Peal::ApiError => e
  puts "Error when calling PostsApi->posts_schedule: #{e}"
end
```

#### Using the posts_schedule_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<Post>, Integer, Hash)> posts_schedule_with_http_info(workspace_id, post_id, schedule_post)

```ruby
begin
  # Schedule a draft
  data, status_code, headers = api_instance.posts_schedule_with_http_info(workspace_id, post_id, schedule_post)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <Post>
rescue Peal::ApiError => e
  puts "Error when calling PostsApi->posts_schedule_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **workspace_id** | **String** |  |  |
| **post_id** | **String** |  |  |
| **schedule_post** | [**SchedulePost**](SchedulePost.md) |  |  |

### Return type

[**Post**](Post.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json


## posts_unschedule

> <Post> posts_unschedule(workspace_id, post_id)

Unschedule a post

Takes a scheduled post back to draft, so its text and media can change: it goes out at no time until it is scheduled again. A post already publishing is a conflict. Needs post:schedule.

### Examples

```ruby
require 'time'
require 'peal'
# setup authorization
Peal.configure do |config|
  # Configure Bearer authorization: bearer
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = Peal::PostsApi.new
workspace_id = 'workspace_id_example' # String | 
post_id = 'post_id_example' # String | 

begin
  # Unschedule a post
  result = api_instance.posts_unschedule(workspace_id, post_id)
  p result
rescue Peal::ApiError => e
  puts "Error when calling PostsApi->posts_unschedule: #{e}"
end
```

#### Using the posts_unschedule_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<Post>, Integer, Hash)> posts_unschedule_with_http_info(workspace_id, post_id)

```ruby
begin
  # Unschedule a post
  data, status_code, headers = api_instance.posts_unschedule_with_http_info(workspace_id, post_id)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <Post>
rescue Peal::ApiError => e
  puts "Error when calling PostsApi->posts_unschedule_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **workspace_id** | **String** |  |  |
| **post_id** | **String** |  |  |

### Return type

[**Post**](Post.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## posts_update

> <Post> posts_update(workspace_id, post_id, post_draft)

Update a draft

Replaces a draft's content, channels and options: options left out are removed. A post that is no longer a draft is a conflict. Needs post:update, channel:read, and media:read when it shows media.

### Examples

```ruby
require 'time'
require 'peal'
# setup authorization
Peal.configure do |config|
  # Configure Bearer authorization: bearer
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = Peal::PostsApi.new
workspace_id = 'workspace_id_example' # String | 
post_id = 'post_id_example' # String | 
post_draft = Peal::PostDraft.new({channel_ids: ['channel_ids_example'], content: Peal::PostContent.new({media: [Peal::MediaAttachment.new({alt_text: 'alt_text_example', media_id: 'media_id_example'})], overrides: [Peal::TextOverride.new({channel_id: 'channel_id_example', text: 'text_example'})], text: 'text_example'})}) # PostDraft | 

begin
  # Update a draft
  result = api_instance.posts_update(workspace_id, post_id, post_draft)
  p result
rescue Peal::ApiError => e
  puts "Error when calling PostsApi->posts_update: #{e}"
end
```

#### Using the posts_update_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<Post>, Integer, Hash)> posts_update_with_http_info(workspace_id, post_id, post_draft)

```ruby
begin
  # Update a draft
  data, status_code, headers = api_instance.posts_update_with_http_info(workspace_id, post_id, post_draft)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <Post>
rescue Peal::ApiError => e
  puts "Error when calling PostsApi->posts_update_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **workspace_id** | **String** |  |  |
| **post_id** | **String** |  |  |
| **post_draft** | [**PostDraft**](PostDraft.md) |  |  |

### Return type

[**Post**](Post.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

