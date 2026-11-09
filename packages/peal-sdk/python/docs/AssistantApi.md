# peal.AssistantApi

All URIs are relative to *https://app.peal.social*

Method | HTTP request | Description
------------- | ------------- | -------------
[**assistant_status**](AssistantApi.md#assistant_status) | **GET** /api/workspaces/{workspaceId}/assistant | Get the assistant&#39;s status
[**assistant_suggest**](AssistantApi.md#assistant_suggest) | **POST** /api/workspaces/{workspaceId}/assistant/suggestions | Suggest a change to a post&#39;s text


# **assistant_status**
> AssistantStatus assistant_status(workspace_id)

Get the assistant's status

Tells whether the server has a language model, so clients show the assistant or hide it, and how many requests the workspace has left today. Needs assistant:use.

### Example

* Bearer Authentication (bearer):

```python
import peal
from peal.models.assistant_status import AssistantStatus
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
    api_instance = peal.AssistantApi(api_client)
    workspace_id = 'workspace_id_example' # str | 

    try:
        # Get the assistant's status
        api_response = api_instance.assistant_status(workspace_id)
        print("The response of AssistantApi->assistant_status:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling AssistantApi->assistant_status: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **workspace_id** | **str**|  | 

### Return type

[**AssistantStatus**](AssistantStatus.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | AssistantStatus |  -  |
**401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
**403** | The credentials are valid but do not allow this request. |  -  |
**404** | No workspace with this id is open to the caller. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **assistant_suggest**
> Suggestion assistant_suggest(workspace_id, suggestion_request)

Suggest a change to a post's text

Asks the language model to rewrite, shorten or translate a post's text, or to suggest hashtags for it, and answers once the whole suggestion is checked. The text is sent to the model as data, never as instructions. Each request counts toward the workspace's daily quota, unless the model's provider could not be reached. Needs assistant:use.

### Example

* Bearer Authentication (bearer):

```python
import peal
from peal.models.suggestion import Suggestion
from peal.models.suggestion_request import SuggestionRequest
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
    api_instance = peal.AssistantApi(api_client)
    workspace_id = 'workspace_id_example' # str | 
    suggestion_request = peal.SuggestionRequest() # SuggestionRequest | 

    try:
        # Suggest a change to a post's text
        api_response = api_instance.assistant_suggest(workspace_id, suggestion_request)
        print("The response of AssistantApi->assistant_suggest:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling AssistantApi->assistant_suggest: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **workspace_id** | **str**|  | 
 **suggestion_request** | [**SuggestionRequest**](SuggestionRequest.md)|  | 

### Return type

[**Suggestion**](Suggestion.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Suggestion |  -  |
**401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
**403** | The credentials are valid but do not allow this request. |  -  |
**404** | No workspace with this id is open to the caller. |  -  |
**422** | The text is blank, or longer than the assistant takes (&#x60;maxLength&#x60;). |  -  |
**429** | The workspace used every assistant request it has today. Try again after &#x60;resetsAt&#x60;. |  -  |
**502** | The language model gave no answer the assistant can offer (&#x60;reason&#x60;). Trying again may work, unless the provider declined the text. |  -  |
**503** | The writing assistant is off on this server: no language model is configured. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

