# TiktokApi

All URIs are relative to *https://app.peal.social*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**tiktokCreator**](TiktokApi.md#tiktokcreator) | **GET** /api/workspaces/{workspaceId}/channels/{channelId}/tiktok-creator | Read a TikTok channel\&#39;s creator |



## tiktokCreator

> TikTokAccount tiktokCreator(channelId, workspaceId)

Read a TikTok channel\&#39;s creator

Reads a TikTok channel\&#39;s creator from TikTok: their nickname, the audiences the account offers, the interactions they turned off and the longest video they may post, or why they cannot post now. A channel that is not TikTok\&#39;s is ChannelNotFound. Needs post:create.

### Example

```ts
import {
  Configuration,
  TiktokApi,
} from 'peal';
import type { TiktokCreatorRequest } from 'peal';

async function example() {
  console.log("🚀 Testing peal SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new TiktokApi(config);

  const body = {
    // string
    channelId: channelId_example,
    // string
    workspaceId: workspaceId_example,
  } satisfies TiktokCreatorRequest;

  try {
    const data = await api.tiktokCreator(body);
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
| **channelId** | `string` |  | [Defaults to `undefined`] |
| **workspaceId** | `string` |  | [Defaults to `undefined`] |

### Return type

[**TikTokAccount**](TikTokAccount.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | TikTokAccount |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no channel with this id. | No workspace with this id is open to the caller. |  -  |
| **409** | The channel cannot post now: it is turned off (&#x60;disabled&#x60;), or its account must be reconnected (&#x60;reconnect&#x60;). |  -  |
| **502** | The platform did not answer, or failed on its side. Nothing was connected; try again later. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

