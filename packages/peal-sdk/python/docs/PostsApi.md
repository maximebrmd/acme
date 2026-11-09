# peal.PostsApi

All URIs are relative to *https://app.peal.social*

Method | HTTP request | Description
------------- | ------------- | -------------
[**posts_attempts**](PostsApi.md#posts_attempts) | **GET** /api/workspaces/{workspaceId}/posts/{postId}/attempts | List a post&#39;s attempts
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


# **posts_attempts**
> List[PublicationAttempt] posts_attempts(workspace_id, post_id)

List a post's attempts

Lists every attempt Peal made at publishing the post, by channel, round and attempt, with how each ended. An attempt still in progress is not listed yet. Needs post:read.

### Example

* Bearer Authentication (bearer):

```python
import peal
from peal.models.publication_attempt import PublicationAttempt
from peal.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://app.peal.social
# See configuration.py for a list of all supported configuration parameters.
configuration = peal.Configuration(
    host = "https://app.peal.social"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure Bearer authorization: bearer
configuration = peal.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Enter a context with an instance of the API client
with peal.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = peal.PostsApi(api_client)
    workspace_id = 'workspace_id_example' # str | 
    post_id = 'post_id_example' # str | 

    try:
        # List a post's attempts
        api_response = api_instance.posts_attempts(workspace_id, post_id)
        print("The response of PostsApi->posts_attempts:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling PostsApi->posts_attempts: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **workspace_id** | **str**|  | 
 **post_id** | **str**|  | 

### Return type

[**List[PublicationAttempt]**](PublicationAttempt.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Success |  -  |
**401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
**403** | The credentials are valid but do not allow this request. |  -  |
**404** | The workspace has no post with this id. | No workspace with this id is open to the caller. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **posts_cancel**
> Post posts_cancel(workspace_id, post_id)

Cancel a post

Cancels a draft or a scheduled post. A post already publishing finishes with what its channels did: those not yet sent are cancelled. Needs post:schedule.

### Example

* Bearer Authentication (bearer):

```python
import peal
from peal.models.post import Post
from peal.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://app.peal.social
# See configuration.py for a list of all supported configuration parameters.
configuration = peal.Configuration(
    host = "https://app.peal.social"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure Bearer authorization: bearer
configuration = peal.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Enter a context with an instance of the API client
with peal.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = peal.PostsApi(api_client)
    workspace_id = 'workspace_id_example' # str | 
    post_id = 'post_id_example' # str | 

    try:
        # Cancel a post
        api_response = api_instance.posts_cancel(workspace_id, post_id)
        print("The response of PostsApi->posts_cancel:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling PostsApi->posts_cancel: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **workspace_id** | **str**|  | 
 **post_id** | **str**|  | 

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
**200** | Post |  -  |
**401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
**403** | The credentials are valid but do not allow this request. |  -  |
**404** | The workspace has no post with this id. | No workspace with this id is open to the caller. |  -  |
**409** | The post&#39;s status does not allow this. &#x60;status&#x60; is the status it has. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **posts_confirm**
> Post posts_confirm(workspace_id, post_id, target_id, target_confirmation)

Confirm a post on a channel

Says what you found on the platform for a post unconfirmed on one channel: `published`, with its address if you have it, or `notPublished`, which fails it there so it can be reposted. Its notifications are marked read. Needs post:schedule.

### Example

* Bearer Authentication (bearer):

```python
import peal
from peal.models.post import Post
from peal.models.target_confirmation import TargetConfirmation
from peal.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://app.peal.social
# See configuration.py for a list of all supported configuration parameters.
configuration = peal.Configuration(
    host = "https://app.peal.social"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure Bearer authorization: bearer
configuration = peal.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Enter a context with an instance of the API client
with peal.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = peal.PostsApi(api_client)
    workspace_id = 'workspace_id_example' # str | 
    post_id = 'post_id_example' # str | 
    target_id = 'target_id_example' # str | 
    target_confirmation = peal.TargetConfirmation() # TargetConfirmation | 

    try:
        # Confirm a post on a channel
        api_response = api_instance.posts_confirm(workspace_id, post_id, target_id, target_confirmation)
        print("The response of PostsApi->posts_confirm:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling PostsApi->posts_confirm: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **workspace_id** | **str**|  | 
 **post_id** | **str**|  | 
 **target_id** | **str**|  | 
 **target_confirmation** | [**TargetConfirmation**](TargetConfirmation.md)|  | 

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
**200** | Post |  -  |
**401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
**403** | The credentials are valid but do not allow this request. |  -  |
**404** | The workspace has no post with this id. | No workspace with this id is open to the caller. |  -  |
**409** | The post&#39;s status does not allow this. &#x60;status&#x60; is the status it has. | The post&#39;s status on that channel does not allow this. &#x60;status&#x60; is the status it has. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **posts_create**
> Post posts_create(workspace_id, post_draft)

Create a draft

Creates a draft for some of the workspace's channels, possibly none yet, with options on those whose platform takes them (`TargetOptions`, of the channel's platform). Its media must be the workspace's, and ready. Its text, media and options are checked against each platform's rules when it is scheduled, not before. Needs post:create, channel:read, and media:read when it shows media.

### Example

* Bearer Authentication (bearer):

```python
import peal
from peal.models.post import Post
from peal.models.post_draft import PostDraft
from peal.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://app.peal.social
# See configuration.py for a list of all supported configuration parameters.
configuration = peal.Configuration(
    host = "https://app.peal.social"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure Bearer authorization: bearer
configuration = peal.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Enter a context with an instance of the API client
with peal.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = peal.PostsApi(api_client)
    workspace_id = 'workspace_id_example' # str | 
    post_draft = peal.PostDraft() # PostDraft | 

    try:
        # Create a draft
        api_response = api_instance.posts_create(workspace_id, post_draft)
        print("The response of PostsApi->posts_create:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling PostsApi->posts_create: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **workspace_id** | **str**|  | 
 **post_draft** | [**PostDraft**](PostDraft.md)|  | 

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
**201** | Post |  -  |
**401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
**403** | The credentials are valid but do not allow this request. |  -  |
**404** | No workspace with this id is open to the caller. |  -  |
**422** | The post&#39;s content breaks the rules of its channels&#39; platforms: &#x60;violations&#x60; says how, channel by channel, for its images and videos, media by media, and for its options on a channel, option by option (&#x60;field&#x60;). | Some channels asked for are not connected to the workspace: &#x60;channelIds&#x60; lists them. | Some media attached are not the workspace&#39;s, or not ready to show: &#x60;mediaIds&#x60; lists them. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **posts_discard**
> posts_discard(workspace_id, post_id)

Discard a draft

Deletes a draft. A post scheduled or sent is a conflict: cancel it instead. Needs post:delete, or post:update for the user who created the draft.

### Example

* Bearer Authentication (bearer):

```python
import peal
from peal.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://app.peal.social
# See configuration.py for a list of all supported configuration parameters.
configuration = peal.Configuration(
    host = "https://app.peal.social"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure Bearer authorization: bearer
configuration = peal.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Enter a context with an instance of the API client
with peal.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = peal.PostsApi(api_client)
    workspace_id = 'workspace_id_example' # str | 
    post_id = 'post_id_example' # str | 

    try:
        # Discard a draft
        api_instance.posts_discard(workspace_id, post_id)
    except Exception as e:
        print("Exception when calling PostsApi->posts_discard: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **workspace_id** | **str**|  | 
 **post_id** | **str**|  | 

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
**204** | &lt;No Content&gt; |  -  |
**401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
**403** | The credentials are valid but do not allow this request. |  -  |
**404** | The workspace has no post with this id. | No workspace with this id is open to the caller. |  -  |
**409** | The post&#39;s status does not allow this. &#x60;status&#x60; is the status it has. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **posts_drafts**
> DraftPage posts_drafts(workspace_id, cursor=cursor, limit=limit)

List drafts

Lists the workspace's drafts, newest first, 20 a page unless `limit` (at most 50) says otherwise. Pass the page's `nextCursor` as `cursor` for the next one. Needs post:read.

### Example

* Bearer Authentication (bearer):

```python
import peal
from peal.models.draft_page import DraftPage
from peal.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://app.peal.social
# See configuration.py for a list of all supported configuration parameters.
configuration = peal.Configuration(
    host = "https://app.peal.social"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure Bearer authorization: bearer
configuration = peal.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Enter a context with an instance of the API client
with peal.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = peal.PostsApi(api_client)
    workspace_id = 'workspace_id_example' # str | 
    cursor = 'cursor_example' # str |  (optional)
    limit = 'limit_example' # str |  (optional)

    try:
        # List drafts
        api_response = api_instance.posts_drafts(workspace_id, cursor=cursor, limit=limit)
        print("The response of PostsApi->posts_drafts:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling PostsApi->posts_drafts: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **workspace_id** | **str**|  | 
 **cursor** | **str**|  | [optional] 
 **limit** | **str**|  | [optional] 

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
**200** | DraftPage |  -  |
**400** | BadRequest |  -  |
**401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
**403** | The credentials are valid but do not allow this request. |  -  |
**404** | No workspace with this id is open to the caller. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **posts_get**
> Post posts_get(workspace_id, post_id)

Get a post

Answers with a post of the workspace. Needs post:read.

### Example

* Bearer Authentication (bearer):

```python
import peal
from peal.models.post import Post
from peal.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://app.peal.social
# See configuration.py for a list of all supported configuration parameters.
configuration = peal.Configuration(
    host = "https://app.peal.social"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure Bearer authorization: bearer
configuration = peal.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Enter a context with an instance of the API client
with peal.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = peal.PostsApi(api_client)
    workspace_id = 'workspace_id_example' # str | 
    post_id = 'post_id_example' # str | 

    try:
        # Get a post
        api_response = api_instance.posts_get(workspace_id, post_id)
        print("The response of PostsApi->posts_get:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling PostsApi->posts_get: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **workspace_id** | **str**|  | 
 **post_id** | **str**|  | 

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
**200** | Post |  -  |
**401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
**403** | The credentials are valid but do not allow this request. |  -  |
**404** | The workspace has no post with this id. | No workspace with this id is open to the caller. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **posts_list**
> List[Post] posts_list(workspace_id, var_from, to)

List scheduled posts

Lists the posts scheduled from `from` (included) to `to` (excluded), at most 62 days apart, by scheduled instant, with their channels and how each went. Drafts have no time and are not listed; cancelled posts are, with the time they had. Needs post:read.

### Example

* Bearer Authentication (bearer):

```python
import peal
from peal.models.post import Post
from peal.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://app.peal.social
# See configuration.py for a list of all supported configuration parameters.
configuration = peal.Configuration(
    host = "https://app.peal.social"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure Bearer authorization: bearer
configuration = peal.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Enter a context with an instance of the API client
with peal.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = peal.PostsApi(api_client)
    workspace_id = 'workspace_id_example' # str | 
    var_from = 'var_from_example' # str | 
    to = 'to_example' # str | 

    try:
        # List scheduled posts
        api_response = api_instance.posts_list(workspace_id, var_from, to)
        print("The response of PostsApi->posts_list:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling PostsApi->posts_list: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **workspace_id** | **str**|  | 
 **var_from** | **str**|  | 
 **to** | **str**|  | 

### Return type

[**List[Post]**](Post.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Success |  -  |
**400** | The range ends before it starts, or spans more than 62 days. |  -  |
**401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
**403** | The credentials are valid but do not allow this request. |  -  |
**404** | No workspace with this id is open to the caller. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **posts_repost**
> Post posts_repost(workspace_id, post_id, target_id)

Repost on a channel

Sends the post again, now, on one channel where it failed or is unconfirmed: a new round, with its own attempts. Check the platform first when it is unconfirmed, as it may be live already. Needs post:schedule.

### Example

* Bearer Authentication (bearer):

```python
import peal
from peal.models.post import Post
from peal.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://app.peal.social
# See configuration.py for a list of all supported configuration parameters.
configuration = peal.Configuration(
    host = "https://app.peal.social"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure Bearer authorization: bearer
configuration = peal.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Enter a context with an instance of the API client
with peal.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = peal.PostsApi(api_client)
    workspace_id = 'workspace_id_example' # str | 
    post_id = 'post_id_example' # str | 
    target_id = 'target_id_example' # str | 

    try:
        # Repost on a channel
        api_response = api_instance.posts_repost(workspace_id, post_id, target_id)
        print("The response of PostsApi->posts_repost:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling PostsApi->posts_repost: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **workspace_id** | **str**|  | 
 **post_id** | **str**|  | 
 **target_id** | **str**|  | 

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
**200** | Post |  -  |
**401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
**403** | The credentials are valid but do not allow this request. |  -  |
**404** | The workspace has no post with this id. | No workspace with this id is open to the caller. |  -  |
**409** | The post&#39;s status does not allow this. &#x60;status&#x60; is the status it has. | The post&#39;s status on that channel does not allow this. &#x60;status&#x60; is the status it has. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **posts_reschedule**
> Post posts_reschedule(workspace_id, post_id, post_schedule)

Reschedule a post

Moves a scheduled post to another instant, or schedules a draft on the channels it has. Moved to another month, or scheduled, it must fit that month's posts in the workspace's plan (PlanLimitReached). Needs post:schedule, and channel:read for a draft.

### Example

* Bearer Authentication (bearer):

```python
import peal
from peal.models.post import Post
from peal.models.post_schedule import PostSchedule
from peal.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://app.peal.social
# See configuration.py for a list of all supported configuration parameters.
configuration = peal.Configuration(
    host = "https://app.peal.social"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure Bearer authorization: bearer
configuration = peal.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Enter a context with an instance of the API client
with peal.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = peal.PostsApi(api_client)
    workspace_id = 'workspace_id_example' # str | 
    post_id = 'post_id_example' # str | 
    post_schedule = peal.PostSchedule() # PostSchedule | 

    try:
        # Reschedule a post
        api_response = api_instance.posts_reschedule(workspace_id, post_id, post_schedule)
        print("The response of PostsApi->posts_reschedule:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling PostsApi->posts_reschedule: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **workspace_id** | **str**|  | 
 **post_id** | **str**|  | 
 **post_schedule** | [**PostSchedule**](PostSchedule.md)|  | 

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
**200** | Post |  -  |
**401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
**402** | The workspace&#39;s plan allows no more of &#x60;limit&#x60;: it has &#x60;allowed&#x60; already. A larger plan, or removing some, makes room. Nothing was changed. |  -  |
**403** | The credentials are valid but do not allow this request. |  -  |
**404** | The workspace has no post with this id. | No workspace with this id is open to the caller. |  -  |
**409** | The post&#39;s status does not allow this. &#x60;status&#x60; is the status it has. |  -  |
**422** | The time asked for has passed. A time up to a minute ago publishes now. | The time zone is not an IANA time zone such as Europe/Paris. Offsets such as +01:00 are refused. | The post&#39;s content breaks the rules of its channels&#39; platforms: &#x60;violations&#x60; says how, channel by channel, for its images and videos, media by media, and for its options on a channel, option by option (&#x60;field&#x60;). | Some channels asked for are not connected to the workspace: &#x60;channelIds&#x60; lists them. | Some media attached are not the workspace&#39;s, or not ready to show: &#x60;mediaIds&#x60; lists them. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **posts_schedule**
> Post posts_schedule(workspace_id, post_id, schedule_post)

Schedule a draft

Schedules a draft on some of the workspace's channels at an instant, kept with the IANA time zone it was chosen in. The content must fit each platform's rules, its media included: file types, sizes, durations, dimensions, alt text, how many videos, and whether images and videos go together. A channel whose platform takes options needs those it requires, as the draft gives them on that channel: a channel the draft was not for has none yet. A time up to a minute ago publishes now. On a server that bills, the posts going out in that month (UTC) must fit the workspace's plan (PlanLimitReached). Needs post:schedule and channel:read, and media:read when it shows media.

### Example

* Bearer Authentication (bearer):

```python
import peal
from peal.models.post import Post
from peal.models.schedule_post import SchedulePost
from peal.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://app.peal.social
# See configuration.py for a list of all supported configuration parameters.
configuration = peal.Configuration(
    host = "https://app.peal.social"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure Bearer authorization: bearer
configuration = peal.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Enter a context with an instance of the API client
with peal.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = peal.PostsApi(api_client)
    workspace_id = 'workspace_id_example' # str | 
    post_id = 'post_id_example' # str | 
    schedule_post = peal.SchedulePost() # SchedulePost | 

    try:
        # Schedule a draft
        api_response = api_instance.posts_schedule(workspace_id, post_id, schedule_post)
        print("The response of PostsApi->posts_schedule:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling PostsApi->posts_schedule: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **workspace_id** | **str**|  | 
 **post_id** | **str**|  | 
 **schedule_post** | [**SchedulePost**](SchedulePost.md)|  | 

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
**200** | Post |  -  |
**401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
**402** | The workspace&#39;s plan allows no more of &#x60;limit&#x60;: it has &#x60;allowed&#x60; already. A larger plan, or removing some, makes room. Nothing was changed. |  -  |
**403** | The credentials are valid but do not allow this request. |  -  |
**404** | The workspace has no post with this id. | No workspace with this id is open to the caller. |  -  |
**409** | The post&#39;s status does not allow this. &#x60;status&#x60; is the status it has. |  -  |
**422** | The time asked for has passed. A time up to a minute ago publishes now. | The time zone is not an IANA time zone such as Europe/Paris. Offsets such as +01:00 are refused. | The post&#39;s content breaks the rules of its channels&#39; platforms: &#x60;violations&#x60; says how, channel by channel, for its images and videos, media by media, and for its options on a channel, option by option (&#x60;field&#x60;). | Some channels asked for are not connected to the workspace: &#x60;channelIds&#x60; lists them. | Some media attached are not the workspace&#39;s, or not ready to show: &#x60;mediaIds&#x60; lists them. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **posts_unschedule**
> Post posts_unschedule(workspace_id, post_id)

Unschedule a post

Takes a scheduled post back to draft, so its text and media can change: it goes out at no time until it is scheduled again. A post already publishing is a conflict. Needs post:schedule.

### Example

* Bearer Authentication (bearer):

```python
import peal
from peal.models.post import Post
from peal.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://app.peal.social
# See configuration.py for a list of all supported configuration parameters.
configuration = peal.Configuration(
    host = "https://app.peal.social"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure Bearer authorization: bearer
configuration = peal.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Enter a context with an instance of the API client
with peal.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = peal.PostsApi(api_client)
    workspace_id = 'workspace_id_example' # str | 
    post_id = 'post_id_example' # str | 

    try:
        # Unschedule a post
        api_response = api_instance.posts_unschedule(workspace_id, post_id)
        print("The response of PostsApi->posts_unschedule:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling PostsApi->posts_unschedule: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **workspace_id** | **str**|  | 
 **post_id** | **str**|  | 

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
**200** | Post |  -  |
**401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
**403** | The credentials are valid but do not allow this request. |  -  |
**404** | The workspace has no post with this id. | No workspace with this id is open to the caller. |  -  |
**409** | The post&#39;s status does not allow this. &#x60;status&#x60; is the status it has. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **posts_update**
> Post posts_update(workspace_id, post_id, post_draft)

Update a draft

Replaces a draft's content, channels and options: options left out are removed. A post that is no longer a draft is a conflict. Needs post:update, channel:read, and media:read when it shows media.

### Example

* Bearer Authentication (bearer):

```python
import peal
from peal.models.post import Post
from peal.models.post_draft import PostDraft
from peal.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://app.peal.social
# See configuration.py for a list of all supported configuration parameters.
configuration = peal.Configuration(
    host = "https://app.peal.social"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure Bearer authorization: bearer
configuration = peal.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Enter a context with an instance of the API client
with peal.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = peal.PostsApi(api_client)
    workspace_id = 'workspace_id_example' # str | 
    post_id = 'post_id_example' # str | 
    post_draft = peal.PostDraft() # PostDraft | 

    try:
        # Update a draft
        api_response = api_instance.posts_update(workspace_id, post_id, post_draft)
        print("The response of PostsApi->posts_update:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling PostsApi->posts_update: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **workspace_id** | **str**|  | 
 **post_id** | **str**|  | 
 **post_draft** | [**PostDraft**](PostDraft.md)|  | 

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
**200** | Post |  -  |
**401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
**403** | The credentials are valid but do not allow this request. |  -  |
**404** | The workspace has no post with this id. | No workspace with this id is open to the caller. |  -  |
**409** | The post&#39;s status does not allow this. &#x60;status&#x60; is the status it has. |  -  |
**422** | The post&#39;s content breaks the rules of its channels&#39; platforms: &#x60;violations&#x60; says how, channel by channel, for its images and videos, media by media, and for its options on a channel, option by option (&#x60;field&#x60;). | Some channels asked for are not connected to the workspace: &#x60;channelIds&#x60; lists them. | Some media attached are not the workspace&#39;s, or not ready to show: &#x60;mediaIds&#x60; lists them. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

