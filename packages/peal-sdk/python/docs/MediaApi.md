# peal.MediaApi

All URIs are relative to *https://app.peal.social*

Method | HTTP request | Description
------------- | ------------- | -------------
[**media_complete**](MediaApi.md#media_complete) | **POST** /api/workspaces/{workspaceId}/media/{mediaId}/complete | Complete an upload
[**media_create**](MediaApi.md#media_create) | **POST** /api/workspaces/{workspaceId}/media | Start an upload
[**media_delete**](MediaApi.md#media_delete) | **DELETE** /api/workspaces/{workspaceId}/media/{mediaId} | Delete media
[**media_describe**](MediaApi.md#media_describe) | **PATCH** /api/workspaces/{workspaceId}/media/{mediaId} | Describe media
[**media_get**](MediaApi.md#media_get) | **GET** /api/workspaces/{workspaceId}/media/{mediaId} | Get media
[**media_list**](MediaApi.md#media_list) | **GET** /api/workspaces/{workspaceId}/media | List media
[**media_usage**](MediaApi.md#media_usage) | **GET** /api/workspaces/{workspaceId}/media/{mediaId}/usage | Get where media is used


# **media_complete**
> Media media_complete(workspace_id, media_id)

Complete an upload

Checks that the file reached the store with the declared size and type, joining its parts first, then probes it: the media is ready, or stays uploaded with why it could not be probed. Calling it again is safe, and probes an uploaded file again. Needs media:upload.

### Example

* Bearer Authentication (bearer):

```python
import peal
from peal.models.media import Media
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
    api_instance = peal.MediaApi(api_client)
    workspace_id = 'workspace_id_example' # str | 
    media_id = 'media_id_example' # str | 

    try:
        # Complete an upload
        api_response = api_instance.media_complete(workspace_id, media_id)
        print("The response of MediaApi->media_complete:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling MediaApi->media_complete: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **workspace_id** | **str**|  | 
 **media_id** | **str**|  | 

### Return type

[**Media**](Media.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Media |  -  |
**401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
**403** | The credentials are valid but do not allow this request. |  -  |
**404** | The workspace has no media with this id. | No workspace with this id is open to the caller. |  -  |
**409** | The file, or one of its parts, has not reached the store yet. Send what is missing, then complete the upload again. |  -  |
**422** | The stored file does not have the declared size or type. It was deleted, and the media is rejected. |  -  |
**503** | The server cannot reach its media store right now. Try again later. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **media_create**
> PreparedUpload media_create(workspace_id, new_upload)

Start an upload

Records pending media and signs the upload of its file: one PUT for an image or a video up to 16 MiB, one PUT per part for a larger video. Send the file with them, then complete the upload. The requests only take the declared size and content type. On a server that bills, the declared size must fit the plan's media storage with what the workspace stores (PlanLimitReached `mediaStorage`). Needs media:upload.

### Example

* Bearer Authentication (bearer):

```python
import peal
from peal.models.new_upload import NewUpload
from peal.models.prepared_upload import PreparedUpload
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
    api_instance = peal.MediaApi(api_client)
    workspace_id = 'workspace_id_example' # str | 
    new_upload = peal.NewUpload() # NewUpload | 

    try:
        # Start an upload
        api_response = api_instance.media_create(workspace_id, new_upload)
        print("The response of MediaApi->media_create:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling MediaApi->media_create: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **workspace_id** | **str**|  | 
 **new_upload** | [**NewUpload**](NewUpload.md)|  | 

### Return type

[**PreparedUpload**](PreparedUpload.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**201** | PreparedUpload |  -  |
**401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
**402** | The workspace&#39;s plan allows no more of &#x60;limit&#x60;: it has &#x60;allowed&#x60; already. A larger plan, or removing some, makes room. Nothing was changed. |  -  |
**403** | The credentials are valid but do not allow this request. |  -  |
**404** | No workspace with this id is open to the caller. |  -  |
**422** | Peal does not store files of this content type. It takes JPEG, PNG, GIF and WebP images, and MP4 and QuickTime videos. | The file is larger than Peal stores for its kind: 16 MiB for an image, 1 GiB for a video. | The description is longer than Peal keeps. |  -  |
**503** | The server cannot reach its media store right now. Try again later. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **media_delete**
> media_delete(workspace_id, media_id)

Delete media

Deletes the media and its file, and cancels its upload if it is still pending. Drafts that show it lose it. Posts scheduled or publishing that show it refuse the deletion (`MediaInUse`, listing them): take them back to draft first. Needs media:delete.

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
    api_instance = peal.MediaApi(api_client)
    workspace_id = 'workspace_id_example' # str | 
    media_id = 'media_id_example' # str | 

    try:
        # Delete media
        api_instance.media_delete(workspace_id, media_id)
    except Exception as e:
        print("Exception when calling MediaApi->media_delete: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **workspace_id** | **str**|  | 
 **media_id** | **str**|  | 

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
**404** | The workspace has no media with this id. | No workspace with this id is open to the caller. |  -  |
**409** | Posts that are scheduled or publishing show the media. &#x60;postIds&#x60; lists them. |  -  |
**503** | The server cannot reach its media store right now. Try again later. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **media_describe**
> Media media_describe(workspace_id, media_id, media_description)

Describe media

Sets the media's description, which platforms show to people who cannot see it. It can be written while the file uploads. Needs media:upload.

### Example

* Bearer Authentication (bearer):

```python
import peal
from peal.models.media import Media
from peal.models.media_description import MediaDescription
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
    api_instance = peal.MediaApi(api_client)
    workspace_id = 'workspace_id_example' # str | 
    media_id = 'media_id_example' # str | 
    media_description = peal.MediaDescription() # MediaDescription | 

    try:
        # Describe media
        api_response = api_instance.media_describe(workspace_id, media_id, media_description)
        print("The response of MediaApi->media_describe:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling MediaApi->media_describe: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **workspace_id** | **str**|  | 
 **media_id** | **str**|  | 
 **media_description** | [**MediaDescription**](MediaDescription.md)|  | 

### Return type

[**Media**](Media.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Media |  -  |
**401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
**403** | The credentials are valid but do not allow this request. |  -  |
**404** | The workspace has no media with this id. | No workspace with this id is open to the caller. |  -  |
**422** | The description is longer than Peal keeps. |  -  |
**503** | The server cannot reach its media store right now. Try again later. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **media_get**
> Media media_get(workspace_id, media_id)

Get media

Shows one of the workspace's media. Needs media:read.

### Example

* Bearer Authentication (bearer):

```python
import peal
from peal.models.media import Media
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
    api_instance = peal.MediaApi(api_client)
    workspace_id = 'workspace_id_example' # str | 
    media_id = 'media_id_example' # str | 

    try:
        # Get media
        api_response = api_instance.media_get(workspace_id, media_id)
        print("The response of MediaApi->media_get:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling MediaApi->media_get: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **workspace_id** | **str**|  | 
 **media_id** | **str**|  | 

### Return type

[**Media**](Media.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Media |  -  |
**401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
**403** | The credentials are valid but do not allow this request. |  -  |
**404** | The workspace has no media with this id. | No workspace with this id is open to the caller. |  -  |
**503** | The server cannot reach its media store right now. Try again later. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **media_list**
> MediaPage media_list(workspace_id, cursor=cursor, limit=limit)

List media

Lists the workspace's media, newest first, 30 a page unless `limit` (at most 100) says otherwise. Pass the page's `nextCursor` as `cursor` for the next one. Needs media:read.

### Example

* Bearer Authentication (bearer):

```python
import peal
from peal.models.media_page import MediaPage
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
    api_instance = peal.MediaApi(api_client)
    workspace_id = 'workspace_id_example' # str | 
    cursor = 'cursor_example' # str |  (optional)
    limit = 'limit_example' # str |  (optional)

    try:
        # List media
        api_response = api_instance.media_list(workspace_id, cursor=cursor, limit=limit)
        print("The response of MediaApi->media_list:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling MediaApi->media_list: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **workspace_id** | **str**|  | 
 **cursor** | **str**|  | [optional] 
 **limit** | **str**|  | [optional] 

### Return type

[**MediaPage**](MediaPage.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | MediaPage |  -  |
**400** | BadRequest |  -  |
**401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
**403** | The credentials are valid but do not allow this request. |  -  |
**404** | No workspace with this id is open to the caller. |  -  |
**503** | The server cannot reach its media store right now. Try again later. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **media_usage**
> MediaUsage media_usage(workspace_id, media_id)

Get where media is used

Lists the posts that show the media: drafts, which lose it if it is deleted, and posts scheduled or publishing, which keep it from being deleted. Needs media:read.

### Example

* Bearer Authentication (bearer):

```python
import peal
from peal.models.media_usage import MediaUsage
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
    api_instance = peal.MediaApi(api_client)
    workspace_id = 'workspace_id_example' # str | 
    media_id = 'media_id_example' # str | 

    try:
        # Get where media is used
        api_response = api_instance.media_usage(workspace_id, media_id)
        print("The response of MediaApi->media_usage:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling MediaApi->media_usage: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **workspace_id** | **str**|  | 
 **media_id** | **str**|  | 

### Return type

[**MediaUsage**](MediaUsage.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | MediaUsage |  -  |
**401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
**403** | The credentials are valid but do not allow this request. |  -  |
**404** | The workspace has no media with this id. | No workspace with this id is open to the caller. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

