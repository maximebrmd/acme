# Peal.Api.MediaApi

All URIs are relative to *https://app.peal.social*

| Method | HTTP request | Description |
|--------|--------------|-------------|
| [**MediaComplete**](MediaApi.md#mediacomplete) | **POST** /api/workspaces/{workspaceId}/media/{mediaId}/complete | Complete an upload |
| [**MediaCreate**](MediaApi.md#mediacreate) | **POST** /api/workspaces/{workspaceId}/media | Start an upload |
| [**MediaDelete**](MediaApi.md#mediadelete) | **DELETE** /api/workspaces/{workspaceId}/media/{mediaId} | Delete media |
| [**MediaDescribe**](MediaApi.md#mediadescribe) | **PATCH** /api/workspaces/{workspaceId}/media/{mediaId} | Describe media |
| [**MediaGet**](MediaApi.md#mediaget) | **GET** /api/workspaces/{workspaceId}/media/{mediaId} | Get media |
| [**MediaList**](MediaApi.md#medialist) | **GET** /api/workspaces/{workspaceId}/media | List media |
| [**MediaUsage**](MediaApi.md#mediausage) | **GET** /api/workspaces/{workspaceId}/media/{mediaId}/usage | Get where media is used |

<a id="mediacomplete"></a>
# **MediaComplete**
> Media MediaComplete (string workspaceId, string mediaId)

Complete an upload

Checks that the file reached the store with the declared size and type, joining its parts first, then probes it: the media is ready, or stays uploaded with why it could not be probed. Calling it again is safe, and probes an uploaded file again. Needs media:upload.


### Parameters

| Name | Type | Description | Notes |
|------|------|-------------|-------|
| **workspaceId** | **string** |  |  |
| **mediaId** | **string** |  |  |

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
| **200** | Media |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no media with this id. | No workspace with this id is open to the caller. |  -  |
| **409** | The file, or one of its parts, has not reached the store yet. Send what is missing, then complete the upload again. |  -  |
| **422** | The stored file does not have the declared size or type. It was deleted, and the media is rejected. |  -  |
| **503** | The server cannot reach its media store right now. Try again later. |  -  |

[[Back to top]](#) [[Back to API list]](../../README.md#documentation-for-api-endpoints) [[Back to Model list]](../../README.md#documentation-for-models) [[Back to README]](../../README.md)

<a id="mediacreate"></a>
# **MediaCreate**
> PreparedUpload MediaCreate (string workspaceId, NewUpload newUpload)

Start an upload

Records pending media and signs the upload of its file: one PUT for an image or a video up to 16 MiB, one PUT per part for a larger video. Send the file with them, then complete the upload. The requests only take the declared size and content type. Needs media:upload.


### Parameters

| Name | Type | Description | Notes |
|------|------|-------------|-------|
| **workspaceId** | **string** |  |  |
| **newUpload** | [**NewUpload**](NewUpload.md) |  |  |

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
| **201** | PreparedUpload |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | No workspace with this id is open to the caller. |  -  |
| **422** | Peal does not store files of this content type. It takes JPEG, PNG, GIF and WebP images, and MP4 and QuickTime videos. | The file is larger than Peal stores for its kind: 16 MiB for an image, 1 GiB for a video. | The description is longer than Peal keeps. |  -  |
| **503** | The server cannot reach its media store right now. Try again later. |  -  |

[[Back to top]](#) [[Back to API list]](../../README.md#documentation-for-api-endpoints) [[Back to Model list]](../../README.md#documentation-for-models) [[Back to README]](../../README.md)

<a id="mediadelete"></a>
# **MediaDelete**
> void MediaDelete (string workspaceId, string mediaId)

Delete media

Deletes the media and its file, and cancels its upload if it is still pending. Drafts that show it lose it. Posts scheduled or publishing that show it refuse the deletion (`MediaInUse`, listing them): take them back to draft first. Needs media:delete.


### Parameters

| Name | Type | Description | Notes |
|------|------|-------------|-------|
| **workspaceId** | **string** |  |  |
| **mediaId** | **string** |  |  |

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
| **404** | The workspace has no media with this id. | No workspace with this id is open to the caller. |  -  |
| **409** | Posts that are scheduled or publishing show the media. &#x60;postIds&#x60; lists them. |  -  |
| **503** | The server cannot reach its media store right now. Try again later. |  -  |

[[Back to top]](#) [[Back to API list]](../../README.md#documentation-for-api-endpoints) [[Back to Model list]](../../README.md#documentation-for-models) [[Back to README]](../../README.md)

<a id="mediadescribe"></a>
# **MediaDescribe**
> Media MediaDescribe (string workspaceId, string mediaId, MediaDescription mediaDescription)

Describe media

Sets the media's description, which platforms show to people who cannot see it. It can be written while the file uploads. Needs media:upload.


### Parameters

| Name | Type | Description | Notes |
|------|------|-------------|-------|
| **workspaceId** | **string** |  |  |
| **mediaId** | **string** |  |  |
| **mediaDescription** | [**MediaDescription**](MediaDescription.md) |  |  |

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
| **200** | Media |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no media with this id. | No workspace with this id is open to the caller. |  -  |
| **422** | The description is longer than Peal keeps. |  -  |
| **503** | The server cannot reach its media store right now. Try again later. |  -  |

[[Back to top]](#) [[Back to API list]](../../README.md#documentation-for-api-endpoints) [[Back to Model list]](../../README.md#documentation-for-models) [[Back to README]](../../README.md)

<a id="mediaget"></a>
# **MediaGet**
> Media MediaGet (string workspaceId, string mediaId)

Get media

Shows one of the workspace's media. Needs media:read.


### Parameters

| Name | Type | Description | Notes |
|------|------|-------------|-------|
| **workspaceId** | **string** |  |  |
| **mediaId** | **string** |  |  |

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
| **200** | Media |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no media with this id. | No workspace with this id is open to the caller. |  -  |
| **503** | The server cannot reach its media store right now. Try again later. |  -  |

[[Back to top]](#) [[Back to API list]](../../README.md#documentation-for-api-endpoints) [[Back to Model list]](../../README.md#documentation-for-models) [[Back to README]](../../README.md)

<a id="medialist"></a>
# **MediaList**
> MediaPage MediaList (string workspaceId, string cursor = null, string limit = null)

List media

Lists the workspace's media, newest first, 30 a page unless `limit` (at most 100) says otherwise. Pass the page's `nextCursor` as `cursor` for the next one. Needs media:read.


### Parameters

| Name | Type | Description | Notes |
|------|------|-------------|-------|
| **workspaceId** | **string** |  |  |
| **cursor** | **string** |  | [optional]  |
| **limit** | **string** |  | [optional]  |

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
| **200** | MediaPage |  -  |
| **400** | BadRequest |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | No workspace with this id is open to the caller. |  -  |
| **503** | The server cannot reach its media store right now. Try again later. |  -  |

[[Back to top]](#) [[Back to API list]](../../README.md#documentation-for-api-endpoints) [[Back to Model list]](../../README.md#documentation-for-models) [[Back to README]](../../README.md)

<a id="mediausage"></a>
# **MediaUsage**
> MediaUsage MediaUsage (string workspaceId, string mediaId)

Get where media is used

Lists the posts that show the media: drafts, which lose it if it is deleted, and posts scheduled or publishing, which keep it from being deleted. Needs media:read.


### Parameters

| Name | Type | Description | Notes |
|------|------|-------------|-------|
| **workspaceId** | **string** |  |  |
| **mediaId** | **string** |  |  |

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
| **200** | MediaUsage |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no media with this id. | No workspace with this id is open to the caller. |  -  |

[[Back to top]](#) [[Back to API list]](../../README.md#documentation-for-api-endpoints) [[Back to Model list]](../../README.md#documentation-for-models) [[Back to README]](../../README.md)

