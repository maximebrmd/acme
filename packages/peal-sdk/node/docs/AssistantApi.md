# AssistantApi

All URIs are relative to *https://app.peal.social*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**assistantStatus**](AssistantApi.md#assistantstatus) | **GET** /api/workspaces/{workspaceId}/assistant | Get the assistant\&#39;s status |
| [**assistantSuggest**](AssistantApi.md#assistantsuggest) | **POST** /api/workspaces/{workspaceId}/assistant/suggestions | Suggest a change to a post\&#39;s text |



## assistantStatus

> AssistantStatus assistantStatus(workspaceId)

Get the assistant\&#39;s status

Tells whether the server has a language model, so clients show the assistant or hide it, and how many requests the workspace has left today. Needs assistant:use.

### Example

```ts
import {
  Configuration,
  AssistantApi,
} from 'peal';
import type { AssistantStatusRequest } from 'peal';

async function example() {
  console.log("🚀 Testing peal SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new AssistantApi(config);

  const body = {
    // string
    workspaceId: workspaceId_example,
  } satisfies AssistantStatusRequest;

  try {
    const data = await api.assistantStatus(body);
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

### Return type

[**AssistantStatus**](AssistantStatus.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | AssistantStatus |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | No workspace with this id is open to the caller. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## assistantSuggest

> Suggestion assistantSuggest(workspaceId, suggestionRequest)

Suggest a change to a post\&#39;s text

Asks the language model to rewrite, shorten or translate a post\&#39;s text, or to suggest hashtags for it, and answers once the whole suggestion is checked. The text is sent to the model as data, never as instructions. Each request counts toward the workspace\&#39;s daily quota, unless the model\&#39;s provider could not be reached. Needs assistant:use.

### Example

```ts
import {
  Configuration,
  AssistantApi,
} from 'peal';
import type { AssistantSuggestRequest } from 'peal';

async function example() {
  console.log("🚀 Testing peal SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new AssistantApi(config);

  const body = {
    // string
    workspaceId: workspaceId_example,
    // SuggestionRequest
    suggestionRequest: ...,
  } satisfies AssistantSuggestRequest;

  try {
    const data = await api.assistantSuggest(body);
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
| **suggestionRequest** | [SuggestionRequest](SuggestionRequest.md) |  | |

### Return type

[**Suggestion**](Suggestion.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Suggestion |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | No workspace with this id is open to the caller. |  -  |
| **422** | The text is blank, or longer than the assistant takes (&#x60;maxLength&#x60;). |  -  |
| **429** | The workspace used every assistant request it has today. Try again after &#x60;resetsAt&#x60;. |  -  |
| **502** | The language model gave no answer the assistant can offer (&#x60;reason&#x60;). Trying again may work, unless the provider declined the text. |  -  |
| **503** | The writing assistant is off on this server: no language model is configured. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

