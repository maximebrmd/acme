# AnalyticsApi

All URIs are relative to *https://app.peal.social*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**analyticsPost**](AnalyticsApi.md#analyticspost) | **GET** /api/workspaces/{workspaceId}/analytics/posts/{postId} | Get a post\&#39;s analytics |
| [**analyticsSummary**](AnalyticsApi.md#analyticssummary) | **GET** /api/workspaces/{workspaceId}/analytics/summary | Summarize the workspace\&#39;s analytics |



## analyticsPost

> PostAnalytics analyticsPost(workspaceId, postId)

Get a post\&#39;s analytics

Answers with the counts of a post on each channel it went live on, over time. A post not published yet, or whose counts were not read yet, has no targets. Needs analytics:read.

### Example

```ts
import {
  Configuration,
  AnalyticsApi,
} from 'peal-sdk';
import type { AnalyticsPostRequest } from 'peal-sdk';

async function example() {
  console.log("🚀 Testing peal-sdk SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new AnalyticsApi(config);

  const body = {
    // string
    workspaceId: workspaceId_example,
    // string
    postId: postId_example,
  } satisfies AnalyticsPostRequest;

  try {
    const data = await api.analyticsPost(body);
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

[**PostAnalytics**](PostAnalytics.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | PostAnalytics |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | No workspace with this id is open to the caller. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## analyticsSummary

> AnalyticsSummary analyticsSummary(workspaceId, from, timeZone, to)

Summarize the workspace\&#39;s analytics

Sums up the posts published from &#x60;from&#x60; to &#x60;to&#x60;, both included and at most 366 days, as days run in &#x60;timeZone&#x60; (an IANA zone such as Europe/Paris): their latest counts in all and by channel, what they gained each day, and the five with the most engagement (likes, reposts, replies and quotes). Counts are read from the platforms every hour for 48 hours after a post goes live, then every day until it is 30 days old. Needs analytics:read.

### Example

```ts
import {
  Configuration,
  AnalyticsApi,
} from 'peal-sdk';
import type { AnalyticsSummaryRequest } from 'peal-sdk';

async function example() {
  console.log("🚀 Testing peal-sdk SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new AnalyticsApi(config);

  const body = {
    // string
    workspaceId: workspaceId_example,
    // string
    from: from_example,
    // string
    timeZone: timeZone_example,
    // string
    to: to_example,
  } satisfies AnalyticsSummaryRequest;

  try {
    const data = await api.analyticsSummary(body);
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
| **timeZone** | `string` |  | [Defaults to `undefined`] |
| **to** | `string` |  | [Defaults to `undefined`] |

### Return type

[**AnalyticsSummary**](AnalyticsSummary.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | AnalyticsSummary |  -  |
| **400** | The range of days ends before it starts, or spans more than 366 days. |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | No workspace with this id is open to the caller. |  -  |
| **422** | The time zone is not an IANA time zone such as Europe/Paris. Offsets such as +01:00 are refused. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

