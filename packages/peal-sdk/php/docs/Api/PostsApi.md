# Peal\PostsApi



All URIs are relative to https://app.peal.social, except if the operation defines another base path.

| Method | HTTP request | Description |
| ------------- | ------------- | ------------- |
| [**postsAttempts()**](PostsApi.md#postsAttempts) | **GET** /api/workspaces/{workspaceId}/posts/{postId}/attempts | List a post&#39;s attempts |
| [**postsCancel()**](PostsApi.md#postsCancel) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/cancel | Cancel a post |
| [**postsConfirm()**](PostsApi.md#postsConfirm) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/targets/{targetId}/confirm | Confirm a post on a channel |
| [**postsCreate()**](PostsApi.md#postsCreate) | **POST** /api/workspaces/{workspaceId}/posts | Create a draft |
| [**postsDiscard()**](PostsApi.md#postsDiscard) | **DELETE** /api/workspaces/{workspaceId}/posts/{postId} | Discard a draft |
| [**postsDrafts()**](PostsApi.md#postsDrafts) | **GET** /api/workspaces/{workspaceId}/posts/drafts | List drafts |
| [**postsGet()**](PostsApi.md#postsGet) | **GET** /api/workspaces/{workspaceId}/posts/{postId} | Get a post |
| [**postsList()**](PostsApi.md#postsList) | **GET** /api/workspaces/{workspaceId}/posts | List scheduled posts |
| [**postsRepost()**](PostsApi.md#postsRepost) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/targets/{targetId}/repost | Repost on a channel |
| [**postsReschedule()**](PostsApi.md#postsReschedule) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/reschedule | Reschedule a post |
| [**postsSchedule()**](PostsApi.md#postsSchedule) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/schedule | Schedule a draft |
| [**postsUnschedule()**](PostsApi.md#postsUnschedule) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/unschedule | Unschedule a post |
| [**postsUpdate()**](PostsApi.md#postsUpdate) | **PUT** /api/workspaces/{workspaceId}/posts/{postId} | Update a draft |


## `postsAttempts()`

```php
postsAttempts($workspace_id, $post_id): \Peal\Model\PublicationAttempt[]
```

List a post's attempts

Lists every attempt Peal made at publishing the post, by channel, round and attempt, with how each ended. An attempt still in progress is not listed yet. Needs post:read.

### Example

```php
<?php
require_once(__DIR__ . '/vendor/autoload.php');


// Configure Bearer authorization: bearer
$config = Peal\Configuration::getDefaultConfiguration()->setAccessToken('YOUR_ACCESS_TOKEN');


$apiInstance = new Peal\Api\PostsApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$workspace_id = 'workspace_id_example'; // string
$post_id = 'post_id_example'; // string

try {
    $result = $apiInstance->postsAttempts($workspace_id, $post_id);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling PostsApi->postsAttempts: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **workspace_id** | **string**|  | |
| **post_id** | **string**|  | |

### Return type

[**\Peal\Model\PublicationAttempt[]**](../Model/PublicationAttempt.md)

### Authorization

[bearer](../../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)

## `postsCancel()`

```php
postsCancel($workspace_id, $post_id): \Peal\Model\Post
```

Cancel a post

Cancels a draft or a scheduled post. A post already publishing finishes with what its channels did: those not yet sent are cancelled. Needs post:schedule.

### Example

```php
<?php
require_once(__DIR__ . '/vendor/autoload.php');


// Configure Bearer authorization: bearer
$config = Peal\Configuration::getDefaultConfiguration()->setAccessToken('YOUR_ACCESS_TOKEN');


$apiInstance = new Peal\Api\PostsApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$workspace_id = 'workspace_id_example'; // string
$post_id = 'post_id_example'; // string

try {
    $result = $apiInstance->postsCancel($workspace_id, $post_id);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling PostsApi->postsCancel: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **workspace_id** | **string**|  | |
| **post_id** | **string**|  | |

### Return type

[**\Peal\Model\Post**](../Model/Post.md)

### Authorization

[bearer](../../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)

## `postsConfirm()`

```php
postsConfirm($workspace_id, $post_id, $target_id, $target_confirmation): \Peal\Model\Post
```

Confirm a post on a channel

Says what you found on the platform for a post unconfirmed on one channel: `published`, with its address if you have it, or `notPublished`, which fails it there so it can be reposted. Its notifications are marked read. Needs post:schedule.

### Example

```php
<?php
require_once(__DIR__ . '/vendor/autoload.php');


// Configure Bearer authorization: bearer
$config = Peal\Configuration::getDefaultConfiguration()->setAccessToken('YOUR_ACCESS_TOKEN');


$apiInstance = new Peal\Api\PostsApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$workspace_id = 'workspace_id_example'; // string
$post_id = 'post_id_example'; // string
$target_id = 'target_id_example'; // string
$target_confirmation = new \Peal\Model\TargetConfirmation(); // \Peal\Model\TargetConfirmation

try {
    $result = $apiInstance->postsConfirm($workspace_id, $post_id, $target_id, $target_confirmation);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling PostsApi->postsConfirm: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **workspace_id** | **string**|  | |
| **post_id** | **string**|  | |
| **target_id** | **string**|  | |
| **target_confirmation** | [**\Peal\Model\TargetConfirmation**](../Model/TargetConfirmation.md)|  | |

### Return type

[**\Peal\Model\Post**](../Model/Post.md)

### Authorization

[bearer](../../README.md#bearer)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)

## `postsCreate()`

```php
postsCreate($workspace_id, $post_draft): \Peal\Model\Post
```

Create a draft

Creates a draft for some of the workspace's channels, possibly none yet, with options on those whose platform takes them (`TargetOptions`, of the channel's platform). Its media must be the workspace's, and ready. Its text, media and options are checked against each platform's rules when it is scheduled, not before. Needs post:create, channel:read, and media:read when it shows media.

### Example

```php
<?php
require_once(__DIR__ . '/vendor/autoload.php');


// Configure Bearer authorization: bearer
$config = Peal\Configuration::getDefaultConfiguration()->setAccessToken('YOUR_ACCESS_TOKEN');


$apiInstance = new Peal\Api\PostsApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$workspace_id = 'workspace_id_example'; // string
$post_draft = new \Peal\Model\PostDraft(); // \Peal\Model\PostDraft

try {
    $result = $apiInstance->postsCreate($workspace_id, $post_draft);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling PostsApi->postsCreate: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **workspace_id** | **string**|  | |
| **post_draft** | [**\Peal\Model\PostDraft**](../Model/PostDraft.md)|  | |

### Return type

[**\Peal\Model\Post**](../Model/Post.md)

### Authorization

[bearer](../../README.md#bearer)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)

## `postsDiscard()`

```php
postsDiscard($workspace_id, $post_id)
```

Discard a draft

Deletes a draft. A post scheduled or sent is a conflict: cancel it instead. Needs post:delete, or post:update for the user who created the draft.

### Example

```php
<?php
require_once(__DIR__ . '/vendor/autoload.php');


// Configure Bearer authorization: bearer
$config = Peal\Configuration::getDefaultConfiguration()->setAccessToken('YOUR_ACCESS_TOKEN');


$apiInstance = new Peal\Api\PostsApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$workspace_id = 'workspace_id_example'; // string
$post_id = 'post_id_example'; // string

try {
    $apiInstance->postsDiscard($workspace_id, $post_id);
} catch (Exception $e) {
    echo 'Exception when calling PostsApi->postsDiscard: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **workspace_id** | **string**|  | |
| **post_id** | **string**|  | |

### Return type

void (empty response body)

### Authorization

[bearer](../../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)

## `postsDrafts()`

```php
postsDrafts($workspace_id, $cursor, $limit): \Peal\Model\DraftPage
```

List drafts

Lists the workspace's drafts, newest first, 20 a page unless `limit` (at most 50) says otherwise. Pass the page's `nextCursor` as `cursor` for the next one. Needs post:read.

### Example

```php
<?php
require_once(__DIR__ . '/vendor/autoload.php');


// Configure Bearer authorization: bearer
$config = Peal\Configuration::getDefaultConfiguration()->setAccessToken('YOUR_ACCESS_TOKEN');


$apiInstance = new Peal\Api\PostsApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$workspace_id = 'workspace_id_example'; // string
$cursor = 'cursor_example'; // string
$limit = 'limit_example'; // string

try {
    $result = $apiInstance->postsDrafts($workspace_id, $cursor, $limit);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling PostsApi->postsDrafts: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **workspace_id** | **string**|  | |
| **cursor** | **string**|  | [optional] |
| **limit** | **string**|  | [optional] |

### Return type

[**\Peal\Model\DraftPage**](../Model/DraftPage.md)

### Authorization

[bearer](../../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)

## `postsGet()`

```php
postsGet($workspace_id, $post_id): \Peal\Model\Post
```

Get a post

Answers with a post of the workspace. Needs post:read.

### Example

```php
<?php
require_once(__DIR__ . '/vendor/autoload.php');


// Configure Bearer authorization: bearer
$config = Peal\Configuration::getDefaultConfiguration()->setAccessToken('YOUR_ACCESS_TOKEN');


$apiInstance = new Peal\Api\PostsApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$workspace_id = 'workspace_id_example'; // string
$post_id = 'post_id_example'; // string

try {
    $result = $apiInstance->postsGet($workspace_id, $post_id);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling PostsApi->postsGet: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **workspace_id** | **string**|  | |
| **post_id** | **string**|  | |

### Return type

[**\Peal\Model\Post**](../Model/Post.md)

### Authorization

[bearer](../../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)

## `postsList()`

```php
postsList($workspace_id, $from, $to): \Peal\Model\Post[]
```

List scheduled posts

Lists the posts scheduled from `from` (included) to `to` (excluded), at most 62 days apart, by scheduled instant, with their channels and how each went. Drafts have no time and are not listed; cancelled posts are, with the time they had. Needs post:read.

### Example

```php
<?php
require_once(__DIR__ . '/vendor/autoload.php');


// Configure Bearer authorization: bearer
$config = Peal\Configuration::getDefaultConfiguration()->setAccessToken('YOUR_ACCESS_TOKEN');


$apiInstance = new Peal\Api\PostsApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$workspace_id = 'workspace_id_example'; // string
$from = 'from_example'; // string
$to = 'to_example'; // string

try {
    $result = $apiInstance->postsList($workspace_id, $from, $to);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling PostsApi->postsList: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **workspace_id** | **string**|  | |
| **from** | **string**|  | |
| **to** | **string**|  | |

### Return type

[**\Peal\Model\Post[]**](../Model/Post.md)

### Authorization

[bearer](../../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)

## `postsRepost()`

```php
postsRepost($workspace_id, $post_id, $target_id): \Peal\Model\Post
```

Repost on a channel

Sends the post again, now, on one channel where it failed or is unconfirmed: a new round, with its own attempts. Check the platform first when it is unconfirmed, as it may be live already. Needs post:schedule.

### Example

```php
<?php
require_once(__DIR__ . '/vendor/autoload.php');


// Configure Bearer authorization: bearer
$config = Peal\Configuration::getDefaultConfiguration()->setAccessToken('YOUR_ACCESS_TOKEN');


$apiInstance = new Peal\Api\PostsApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$workspace_id = 'workspace_id_example'; // string
$post_id = 'post_id_example'; // string
$target_id = 'target_id_example'; // string

try {
    $result = $apiInstance->postsRepost($workspace_id, $post_id, $target_id);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling PostsApi->postsRepost: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **workspace_id** | **string**|  | |
| **post_id** | **string**|  | |
| **target_id** | **string**|  | |

### Return type

[**\Peal\Model\Post**](../Model/Post.md)

### Authorization

[bearer](../../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)

## `postsReschedule()`

```php
postsReschedule($workspace_id, $post_id, $post_schedule): \Peal\Model\Post
```

Reschedule a post

Moves a scheduled post to another instant, or schedules a draft on the channels it has. Moved to another month, or scheduled, it must fit that month's posts in the workspace's plan (PlanLimitReached). Needs post:schedule, and channel:read for a draft.

### Example

```php
<?php
require_once(__DIR__ . '/vendor/autoload.php');


// Configure Bearer authorization: bearer
$config = Peal\Configuration::getDefaultConfiguration()->setAccessToken('YOUR_ACCESS_TOKEN');


$apiInstance = new Peal\Api\PostsApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$workspace_id = 'workspace_id_example'; // string
$post_id = 'post_id_example'; // string
$post_schedule = new \Peal\Model\PostSchedule(); // \Peal\Model\PostSchedule

try {
    $result = $apiInstance->postsReschedule($workspace_id, $post_id, $post_schedule);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling PostsApi->postsReschedule: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **workspace_id** | **string**|  | |
| **post_id** | **string**|  | |
| **post_schedule** | [**\Peal\Model\PostSchedule**](../Model/PostSchedule.md)|  | |

### Return type

[**\Peal\Model\Post**](../Model/Post.md)

### Authorization

[bearer](../../README.md#bearer)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)

## `postsSchedule()`

```php
postsSchedule($workspace_id, $post_id, $schedule_post): \Peal\Model\Post
```

Schedule a draft

Schedules a draft on some of the workspace's channels at an instant, kept with the IANA time zone it was chosen in. The content must fit each platform's rules, its media included: file types, sizes, durations, dimensions, alt text, how many videos, and whether images and videos go together. A channel whose platform takes options needs those it requires, as the draft gives them on that channel: a channel the draft was not for has none yet. A time up to a minute ago publishes now. On a server that bills, the posts going out in that month (UTC) must fit the workspace's plan (PlanLimitReached). Needs post:schedule and channel:read, and media:read when it shows media.

### Example

```php
<?php
require_once(__DIR__ . '/vendor/autoload.php');


// Configure Bearer authorization: bearer
$config = Peal\Configuration::getDefaultConfiguration()->setAccessToken('YOUR_ACCESS_TOKEN');


$apiInstance = new Peal\Api\PostsApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$workspace_id = 'workspace_id_example'; // string
$post_id = 'post_id_example'; // string
$schedule_post = new \Peal\Model\SchedulePost(); // \Peal\Model\SchedulePost

try {
    $result = $apiInstance->postsSchedule($workspace_id, $post_id, $schedule_post);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling PostsApi->postsSchedule: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **workspace_id** | **string**|  | |
| **post_id** | **string**|  | |
| **schedule_post** | [**\Peal\Model\SchedulePost**](../Model/SchedulePost.md)|  | |

### Return type

[**\Peal\Model\Post**](../Model/Post.md)

### Authorization

[bearer](../../README.md#bearer)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)

## `postsUnschedule()`

```php
postsUnschedule($workspace_id, $post_id): \Peal\Model\Post
```

Unschedule a post

Takes a scheduled post back to draft, so its text and media can change: it goes out at no time until it is scheduled again. A post already publishing is a conflict. Needs post:schedule.

### Example

```php
<?php
require_once(__DIR__ . '/vendor/autoload.php');


// Configure Bearer authorization: bearer
$config = Peal\Configuration::getDefaultConfiguration()->setAccessToken('YOUR_ACCESS_TOKEN');


$apiInstance = new Peal\Api\PostsApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$workspace_id = 'workspace_id_example'; // string
$post_id = 'post_id_example'; // string

try {
    $result = $apiInstance->postsUnschedule($workspace_id, $post_id);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling PostsApi->postsUnschedule: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **workspace_id** | **string**|  | |
| **post_id** | **string**|  | |

### Return type

[**\Peal\Model\Post**](../Model/Post.md)

### Authorization

[bearer](../../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)

## `postsUpdate()`

```php
postsUpdate($workspace_id, $post_id, $post_draft): \Peal\Model\Post
```

Update a draft

Replaces a draft's content, channels and options: options left out are removed. A post that is no longer a draft is a conflict. Needs post:update, channel:read, and media:read when it shows media.

### Example

```php
<?php
require_once(__DIR__ . '/vendor/autoload.php');


// Configure Bearer authorization: bearer
$config = Peal\Configuration::getDefaultConfiguration()->setAccessToken('YOUR_ACCESS_TOKEN');


$apiInstance = new Peal\Api\PostsApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$workspace_id = 'workspace_id_example'; // string
$post_id = 'post_id_example'; // string
$post_draft = new \Peal\Model\PostDraft(); // \Peal\Model\PostDraft

try {
    $result = $apiInstance->postsUpdate($workspace_id, $post_id, $post_draft);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling PostsApi->postsUpdate: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **workspace_id** | **string**|  | |
| **post_id** | **string**|  | |
| **post_draft** | [**\Peal\Model\PostDraft**](../Model/PostDraft.md)|  | |

### Return type

[**\Peal\Model\Post**](../Model/Post.md)

### Authorization

[bearer](../../README.md#bearer)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)
