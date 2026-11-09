# NoticesApi

All URIs are relative to *https://app.peal.social*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**noticesList**](NoticesApi.md#noticeslist) | **GET** /api/me/notices | List notices |
| [**noticesMarkAllRead**](NoticesApi.md#noticesmarkallread) | **POST** /api/me/notices/read-all | Mark all notices read |
| [**noticesMarkRead**](NoticesApi.md#noticesmarkread) | **POST** /api/me/notices/read | Mark notices read |
| [**noticesUnread**](NoticesApi.md#noticesunread) | **GET** /api/me/notices/unread | Count unread notices |



## noticesList

> NoticePage noticesList(cursor, limit)

List notices

Lists the user\&#39;s notices, newest first, 20 a page unless &#x60;limit&#x60; (at most 100) says otherwise. Pass the page\&#39;s &#x60;nextCursor&#x60; as &#x60;cursor&#x60; for the next one. Each notice is data, for the client to write in the reader\&#39;s language.

### Example

```ts
import {
  Configuration,
  NoticesApi,
} from 'peal';
import type { NoticesListRequest } from 'peal';

async function example() {
  console.log("🚀 Testing peal SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new NoticesApi(config);

  const body = {
    // string (optional)
    cursor: cursor_example,
    // string (optional)
    limit: limit_example,
  } satisfies NoticesListRequest;

  try {
    const data = await api.noticesList(body);
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
| **cursor** | `string` |  | [Optional] [Defaults to `undefined`] |
| **limit** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NoticePage**](NoticePage.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | NoticePage |  -  |
| **400** | BadRequest |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## noticesMarkAllRead

> UnreadNotices noticesMarkAllRead()

Mark all notices read

Marks every notice of the user read.

### Example

```ts
import {
  Configuration,
  NoticesApi,
} from 'peal';
import type { NoticesMarkAllReadRequest } from 'peal';

async function example() {
  console.log("🚀 Testing peal SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new NoticesApi(config);

  try {
    const data = await api.noticesMarkAllRead();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

This endpoint does not need any parameter.

### Return type

[**UnreadNotices**](UnreadNotices.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | UnreadNotices |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## noticesMarkRead

> UnreadNotices noticesMarkRead(markNoticesRead)

Mark notices read

Marks up to 100 of the user\&#39;s notices read, and answers with how many stay unread. Ids that name none of the user\&#39;s notices, and notices already read, are left as they are.

### Example

```ts
import {
  Configuration,
  NoticesApi,
} from 'peal';
import type { NoticesMarkReadRequest } from 'peal';

async function example() {
  console.log("🚀 Testing peal SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new NoticesApi(config);

  const body = {
    // MarkNoticesRead
    markNoticesRead: ...,
  } satisfies NoticesMarkReadRequest;

  try {
    const data = await api.noticesMarkRead(body);
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
| **markNoticesRead** | [MarkNoticesRead](MarkNoticesRead.md) |  | |

### Return type

[**UnreadNotices**](UnreadNotices.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | UnreadNotices |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## noticesUnread

> UnreadNotices noticesUnread()

Count unread notices

Counts the user\&#39;s unread notices.

### Example

```ts
import {
  Configuration,
  NoticesApi,
} from 'peal';
import type { NoticesUnreadRequest } from 'peal';

async function example() {
  console.log("🚀 Testing peal SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new NoticesApi(config);

  try {
    const data = await api.noticesUnread();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

This endpoint does not need any parameter.

### Return type

[**UnreadNotices**](UnreadNotices.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | UnreadNotices |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

