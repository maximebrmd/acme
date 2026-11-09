# MediaApi

All URIs are relative to *https://app.peal.social*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**mediaComplete**](MediaApi.md#mediacomplete) | **POST** /api/workspaces/{workspaceId}/media/{mediaId}/complete | Complete an upload |
| [**mediaCreate**](MediaApi.md#mediacreate) | **POST** /api/workspaces/{workspaceId}/media | Start an upload |
| [**mediaDelete**](MediaApi.md#mediadelete) | **DELETE** /api/workspaces/{workspaceId}/media/{mediaId} | Delete media |
| [**mediaDescribe**](MediaApi.md#mediadescribe) | **PATCH** /api/workspaces/{workspaceId}/media/{mediaId} | Describe media |
| [**mediaGet**](MediaApi.md#mediaget) | **GET** /api/workspaces/{workspaceId}/media/{mediaId} | Get media |
| [**mediaList**](MediaApi.md#medialist) | **GET** /api/workspaces/{workspaceId}/media | List media |
| [**mediaUsage**](MediaApi.md#mediausage) | **GET** /api/workspaces/{workspaceId}/media/{mediaId}/usage | Get where media is used |



## mediaComplete

> Media mediaComplete(workspaceId, mediaId)

Complete an upload

Checks that the file reached the store with the declared size and type, joining its parts first, then probes it: the media is ready, or stays uploaded with why it could not be probed. Calling it again is safe, and probes an uploaded file again. Needs media:upload.

### Example

```ts
import {
  Configuration,
  MediaApi,
} from 'peal';
import type { MediaCompleteRequest } from 'peal';

async function example() {
  console.log("🚀 Testing peal SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new MediaApi(config);

  const body = {
    // string
    workspaceId: workspaceId_example,
    // string
    mediaId: mediaId_example,
  } satisfies MediaCompleteRequest;

  try {
    const data = await api.mediaComplete(body);
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
| **mediaId** | `string` |  | [Defaults to `undefined`] |

### Return type

[**Media**](Media.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


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

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## mediaCreate

> PreparedUpload mediaCreate(workspaceId, newUpload)

Start an upload

Records pending media and signs the upload of its file: one PUT for an image or a video up to 16 MiB, one PUT per part for a larger video. Send the file with them, then complete the upload. The requests only take the declared size and content type. Needs media:upload.

### Example

```ts
import {
  Configuration,
  MediaApi,
} from 'peal';
import type { MediaCreateRequest } from 'peal';

async function example() {
  console.log("🚀 Testing peal SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new MediaApi(config);

  const body = {
    // string
    workspaceId: workspaceId_example,
    // NewUpload
    newUpload: ...,
  } satisfies MediaCreateRequest;

  try {
    const data = await api.mediaCreate(body);
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
| **newUpload** | [NewUpload](NewUpload.md) |  | |

### Return type

[**PreparedUpload**](PreparedUpload.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | PreparedUpload |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | No workspace with this id is open to the caller. |  -  |
| **422** | Peal does not store files of this content type. It takes JPEG, PNG, GIF and WebP images, and MP4 and QuickTime videos. | The file is larger than Peal stores for its kind: 16 MiB for an image, 1 GiB for a video. | The description is longer than Peal keeps. |  -  |
| **503** | The server cannot reach its media store right now. Try again later. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## mediaDelete

> mediaDelete(workspaceId, mediaId)

Delete media

Deletes the media and its file, and cancels its upload if it is still pending. Drafts that show it lose it. Posts scheduled or publishing that show it refuse the deletion (&#x60;MediaInUse&#x60;, listing them): take them back to draft first. Needs media:delete.

### Example

```ts
import {
  Configuration,
  MediaApi,
} from 'peal';
import type { MediaDeleteRequest } from 'peal';

async function example() {
  console.log("🚀 Testing peal SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new MediaApi(config);

  const body = {
    // string
    workspaceId: workspaceId_example,
    // string
    mediaId: mediaId_example,
  } satisfies MediaDeleteRequest;

  try {
    const data = await api.mediaDelete(body);
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
| **mediaId** | `string` |  | [Defaults to `undefined`] |

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
| **404** | The workspace has no media with this id. | No workspace with this id is open to the caller. |  -  |
| **409** | Posts that are scheduled or publishing show the media. &#x60;postIds&#x60; lists them. |  -  |
| **503** | The server cannot reach its media store right now. Try again later. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## mediaDescribe

> Media mediaDescribe(workspaceId, mediaId, mediaDescription)

Describe media

Sets the media\&#39;s description, which platforms show to people who cannot see it. It can be written while the file uploads. Needs media:upload.

### Example

```ts
import {
  Configuration,
  MediaApi,
} from 'peal';
import type { MediaDescribeRequest } from 'peal';

async function example() {
  console.log("🚀 Testing peal SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new MediaApi(config);

  const body = {
    // string
    workspaceId: workspaceId_example,
    // string
    mediaId: mediaId_example,
    // MediaDescription
    mediaDescription: ...,
  } satisfies MediaDescribeRequest;

  try {
    const data = await api.mediaDescribe(body);
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
| **mediaId** | `string` |  | [Defaults to `undefined`] |
| **mediaDescription** | [MediaDescription](MediaDescription.md) |  | |

### Return type

[**Media**](Media.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Media |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no media with this id. | No workspace with this id is open to the caller. |  -  |
| **422** | The description is longer than Peal keeps. |  -  |
| **503** | The server cannot reach its media store right now. Try again later. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## mediaGet

> Media mediaGet(workspaceId, mediaId)

Get media

Shows one of the workspace\&#39;s media. Needs media:read.

### Example

```ts
import {
  Configuration,
  MediaApi,
} from 'peal';
import type { MediaGetRequest } from 'peal';

async function example() {
  console.log("🚀 Testing peal SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new MediaApi(config);

  const body = {
    // string
    workspaceId: workspaceId_example,
    // string
    mediaId: mediaId_example,
  } satisfies MediaGetRequest;

  try {
    const data = await api.mediaGet(body);
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
| **mediaId** | `string` |  | [Defaults to `undefined`] |

### Return type

[**Media**](Media.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Media |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no media with this id. | No workspace with this id is open to the caller. |  -  |
| **503** | The server cannot reach its media store right now. Try again later. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## mediaList

> MediaPage mediaList(workspaceId, cursor, limit)

List media

Lists the workspace\&#39;s media, newest first, 30 a page unless &#x60;limit&#x60; (at most 100) says otherwise. Pass the page\&#39;s &#x60;nextCursor&#x60; as &#x60;cursor&#x60; for the next one. Needs media:read.

### Example

```ts
import {
  Configuration,
  MediaApi,
} from 'peal';
import type { MediaListRequest } from 'peal';

async function example() {
  console.log("🚀 Testing peal SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new MediaApi(config);

  const body = {
    // string
    workspaceId: workspaceId_example,
    // string (optional)
    cursor: cursor_example,
    // string (optional)
    limit: limit_example,
  } satisfies MediaListRequest;

  try {
    const data = await api.mediaList(body);
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

[**MediaPage**](MediaPage.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | MediaPage |  -  |
| **400** | BadRequest |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | No workspace with this id is open to the caller. |  -  |
| **503** | The server cannot reach its media store right now. Try again later. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## mediaUsage

> MediaUsage mediaUsage(workspaceId, mediaId)

Get where media is used

Lists the posts that show the media: drafts, which lose it if it is deleted, and posts scheduled or publishing, which keep it from being deleted. Needs media:read.

### Example

```ts
import {
  Configuration,
  MediaApi,
} from 'peal';
import type { MediaUsageRequest } from 'peal';

async function example() {
  console.log("🚀 Testing peal SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new MediaApi(config);

  const body = {
    // string
    workspaceId: workspaceId_example,
    // string
    mediaId: mediaId_example,
  } satisfies MediaUsageRequest;

  try {
    const data = await api.mediaUsage(body);
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
| **mediaId** | `string` |  | [Defaults to `undefined`] |

### Return type

[**MediaUsage**](MediaUsage.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | MediaUsage |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no media with this id. | No workspace with this id is open to the caller. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

