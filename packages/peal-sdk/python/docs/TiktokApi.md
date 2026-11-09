# peal.TiktokApi

All URIs are relative to *https://app.peal.social*

Method | HTTP request | Description
------------- | ------------- | -------------
[**tiktok_creator**](TiktokApi.md#tiktok_creator) | **GET** /api/workspaces/{workspaceId}/channels/{channelId}/tiktok-creator | Read a TikTok channel&#39;s creator


# **tiktok_creator**
> TikTokAccount tiktok_creator(channel_id, workspace_id)

Read a TikTok channel's creator

Reads a TikTok channel's creator from TikTok: their nickname, the audiences the account offers, the interactions they turned off and the longest video they may post, or why they cannot post now. A channel that is not TikTok's is ChannelNotFound. Needs post:create.

### Example

* Bearer Authentication (bearer):

```python
import peal
from peal.models.tik_tok_account import TikTokAccount
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
    api_instance = peal.TiktokApi(api_client)
    channel_id = 'channel_id_example' # str | 
    workspace_id = 'workspace_id_example' # str | 

    try:
        # Read a TikTok channel's creator
        api_response = api_instance.tiktok_creator(channel_id, workspace_id)
        print("The response of TiktokApi->tiktok_creator:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling TiktokApi->tiktok_creator: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **channel_id** | **str**|  | 
 **workspace_id** | **str**|  | 

### Return type

[**TikTokAccount**](TikTokAccount.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | TikTokAccount |  -  |
**401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
**403** | The credentials are valid but do not allow this request. |  -  |
**404** | The workspace has no channel with this id. | No workspace with this id is open to the caller. |  -  |
**409** | The channel cannot post now: it is turned off (&#x60;disabled&#x60;), or its account must be reconnected (&#x60;reconnect&#x60;). |  -  |
**502** | The platform did not answer, or failed on its side. Nothing was connected; try again later. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

