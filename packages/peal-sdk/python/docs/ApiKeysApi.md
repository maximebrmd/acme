# peal.ApiKeysApi

All URIs are relative to *https://app.peal.social*

Method | HTTP request | Description
------------- | ------------- | -------------
[**api_keys_create**](ApiKeysApi.md#api_keys_create) | **POST** /api/workspaces/{workspaceId}/api-keys | Create an API key
[**api_keys_list**](ApiKeysApi.md#api_keys_list) | **GET** /api/workspaces/{workspaceId}/api-keys | List API keys
[**api_keys_revoke**](ApiKeysApi.md#api_keys_revoke) | **DELETE** /api/workspaces/{workspaceId}/api-keys/{apiKeyId} | Revoke an API key


# **api_keys_create**
> CreatedApiKey api_keys_create(workspace_id, new_api_key)

Create an API key

Creates an API key for the workspace with some of the caller's permissions, and answers with the key itself, which is not shown again. Needs apiKey:create, and a signed-in member: API keys cannot create keys.

### Example

* Bearer Authentication (bearer):

```python
import peal
from peal.models.created_api_key import CreatedApiKey
from peal.models.new_api_key import NewApiKey
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
    api_instance = peal.ApiKeysApi(api_client)
    workspace_id = 'workspace_id_example' # str | 
    new_api_key = peal.NewApiKey() # NewApiKey | 

    try:
        # Create an API key
        api_response = api_instance.api_keys_create(workspace_id, new_api_key)
        print("The response of ApiKeysApi->api_keys_create:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling ApiKeysApi->api_keys_create: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **workspace_id** | **str**|  | 
 **new_api_key** | [**NewApiKey**](NewApiKey.md)|  | 

### Return type

[**CreatedApiKey**](CreatedApiKey.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**201** | CreatedApiKey |  -  |
**401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
**403** | The credentials are valid but do not allow this request. |  -  |
**404** | No workspace with this id is open to the caller. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **api_keys_list**
> List[ApiKey] api_keys_list(workspace_id)

List API keys

Lists the workspace's API keys. Needs apiKey:read.

### Example

* Bearer Authentication (bearer):

```python
import peal
from peal.models.api_key import ApiKey
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
    api_instance = peal.ApiKeysApi(api_client)
    workspace_id = 'workspace_id_example' # str | 

    try:
        # List API keys
        api_response = api_instance.api_keys_list(workspace_id)
        print("The response of ApiKeysApi->api_keys_list:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling ApiKeysApi->api_keys_list: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **workspace_id** | **str**|  | 

### Return type

[**List[ApiKey]**](ApiKey.md)

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
**404** | No workspace with this id is open to the caller. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **api_keys_revoke**
> api_keys_revoke(workspace_id, api_key_id)

Revoke an API key

Revokes an API key of the workspace: it stops working at once. Needs apiKey:delete.

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
    api_instance = peal.ApiKeysApi(api_client)
    workspace_id = 'workspace_id_example' # str | 
    api_key_id = 'api_key_id_example' # str | 

    try:
        # Revoke an API key
        api_instance.api_keys_revoke(workspace_id, api_key_id)
    except Exception as e:
        print("Exception when calling ApiKeysApi->api_keys_revoke: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **workspace_id** | **str**|  | 
 **api_key_id** | **str**|  | 

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
**404** | The workspace has no API key with this id. | No workspace with this id is open to the caller. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

