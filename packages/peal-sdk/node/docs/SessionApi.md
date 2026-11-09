# SessionApi

All URIs are relative to *https://app.peal.social*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**sessionMe**](SessionApi.md#sessionme) | **GET** /api/me | Get the signed-in user |



## sessionMe

> Me sessionMe()

Get the signed-in user

Answers with the signed-in user and every workspace they belong to, with their role and permissions in each. API keys belong to a workspace, not a user, and get 403.

### Example

```ts
import {
  Configuration,
  SessionApi,
} from 'peal-sdk';
import type { SessionMeRequest } from 'peal-sdk';

async function example() {
  console.log("🚀 Testing peal-sdk SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new SessionApi(config);

  try {
    const data = await api.sessionMe();
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

[**Me**](Me.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Me |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

