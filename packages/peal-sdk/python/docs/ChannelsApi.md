# peal.ChannelsApi

All URIs are relative to *https://app.peal.social*

Method | HTTP request | Description
------------- | ------------- | -------------
[**channels_choose_accounts**](ChannelsApi.md#channels_choose_accounts) | **POST** /api/workspaces/{workspaceId}/channels/connect/{platform}/accounts | Choose the accounts to connect
[**channels_complete_connect**](ChannelsApi.md#channels_complete_connect) | **POST** /api/workspaces/{workspaceId}/channels/connect/{platform}/callback | Complete connecting an account
[**channels_connect**](ChannelsApi.md#channels_connect) | **POST** /api/workspaces/{workspaceId}/channels/connect/{platform} | Start connecting an account
[**channels_disconnect**](ChannelsApi.md#channels_disconnect) | **DELETE** /api/workspaces/{workspaceId}/channels/{channelId} | Disconnect a channel
[**channels_list**](ChannelsApi.md#channels_list) | **GET** /api/workspaces/{workspaceId}/channels | List channels
[**channels_platforms**](ChannelsApi.md#channels_platforms) | **GET** /api/workspaces/{workspaceId}/channels/platforms | List connectable platforms
[**channels_reconnect**](ChannelsApi.md#channels_reconnect) | **POST** /api/workspaces/{workspaceId}/channels/{channelId}/reconnect | Start reconnecting a channel


# **channels_choose_accounts**
> List[Channel] channels_choose_accounts(workspace_id, platform, choose_accounts)

Choose the accounts to connect

Connects the accounts the member chose among those a completed sign-in listed: each becomes a channel of the workspace, or reconnects the one it has. The new accounts chosen need room in the workspace's plan, all of them: otherwise none is connected (PlanLimitReached), and the choice can be made again with fewer. Only the member who completed the sign-in can choose, within 15 minutes, and once an account is connected: a choice that failed before connecting any can be made again. Needs channel:connect.

### Example

* Bearer Authentication (bearer):

```python
import peal
from peal.models.channel import Channel
from peal.models.choose_accounts import ChooseAccounts
from peal.models.platform import Platform
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
    api_instance = peal.ChannelsApi(api_client)
    workspace_id = 'workspace_id_example' # str | 
    platform = peal.Platform() # Platform | 
    choose_accounts = peal.ChooseAccounts() # ChooseAccounts | 

    try:
        # Choose the accounts to connect
        api_response = api_instance.channels_choose_accounts(workspace_id, platform, choose_accounts)
        print("The response of ChannelsApi->channels_choose_accounts:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling ChannelsApi->channels_choose_accounts: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **workspace_id** | **str**|  | 
 **platform** | [**Platform**](.md)|  | 
 **choose_accounts** | [**ChooseAccounts**](ChooseAccounts.md)|  | 

### Return type

[**List[Channel]**](Channel.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Success |  -  |
**401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
**402** | The workspace&#39;s plan allows no more of &#x60;limit&#x60;: it has &#x60;allowed&#x60; already. A larger plan, or removing some, makes room. Nothing was changed. |  -  |
**403** | The credentials are valid but do not allow this request. |  -  |
**404** | The workspace has no channel with this id. | No workspace with this id is open to the caller. |  -  |
**422** | The account was not connected; &#x60;reason&#x60; says why. Nothing was saved. |  -  |
**502** | The platform did not answer, or failed on its side. Nothing was connected; try again later. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **channels_complete_connect**
> ConnectOutcome channels_complete_connect(workspace_id, platform, connect_callback)

Complete connecting an account

Completes a connection with what the platform sent back: the account becomes a channel of the workspace, or the channel it reconnects takes its new tokens. When the sign-in reached several accounts, as the Pages a Facebook user manages, the answer lists them instead, to choose with chooseAccounts. Only the member who started the connection can complete it, once. A new account needs room in the workspace's plan (PlanLimitReached). Needs channel:connect.

### Example

* Bearer Authentication (bearer):

```python
import peal
from peal.models.connect_callback import ConnectCallback
from peal.models.connect_outcome import ConnectOutcome
from peal.models.platform import Platform
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
    api_instance = peal.ChannelsApi(api_client)
    workspace_id = 'workspace_id_example' # str | 
    platform = peal.Platform() # Platform | 
    connect_callback = peal.ConnectCallback() # ConnectCallback | 

    try:
        # Complete connecting an account
        api_response = api_instance.channels_complete_connect(workspace_id, platform, connect_callback)
        print("The response of ChannelsApi->channels_complete_connect:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling ChannelsApi->channels_complete_connect: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **workspace_id** | **str**|  | 
 **platform** | [**Platform**](.md)|  | 
 **connect_callback** | [**ConnectCallback**](ConnectCallback.md)|  | 

### Return type

[**ConnectOutcome**](ConnectOutcome.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | ConnectOutcome |  -  |
**401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
**402** | The workspace&#39;s plan allows no more of &#x60;limit&#x60;: it has &#x60;allowed&#x60; already. A larger plan, or removing some, makes room. Nothing was changed. |  -  |
**403** | The credentials are valid but do not allow this request. |  -  |
**404** | The workspace has no channel with this id. | No workspace with this id is open to the caller. |  -  |
**422** | The account was not connected; &#x60;reason&#x60; says why. Nothing was saved. |  -  |
**502** | The platform did not answer, or failed on its side. Nothing was connected; try again later. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **channels_connect**
> Authorization channels_connect(workspace_id, platform, connect_channel)

Start connecting an account

Starts connecting an account of the platform: answers with the platform's sign-in page, where the browser goes next. For Instagram, `connection` picks Instagram Login (the professional account itself, no Facebook Page needed) or Facebook Login (the accounts linked to the caller's Pages); without it, the server's preferred way. The connection is tied to the caller and the workspace, and must be completed within 15 minutes. On a server that bills, a workspace whose plan allows no more channels gets PlanLimitReached. Needs channel:connect.

### Example

* Bearer Authentication (bearer):

```python
import peal
from peal.models.authorization import Authorization
from peal.models.connect_channel import ConnectChannel
from peal.models.platform import Platform
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
    api_instance = peal.ChannelsApi(api_client)
    workspace_id = 'workspace_id_example' # str | 
    platform = peal.Platform() # Platform | 
    connect_channel = peal.ConnectChannel() # ConnectChannel | 

    try:
        # Start connecting an account
        api_response = api_instance.channels_connect(workspace_id, platform, connect_channel)
        print("The response of ChannelsApi->channels_connect:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling ChannelsApi->channels_connect: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **workspace_id** | **str**|  | 
 **platform** | [**Platform**](.md)|  | 
 **connect_channel** | [**ConnectChannel**](ConnectChannel.md)|  | 

### Return type

[**Authorization**](Authorization.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Authorization |  -  |
**401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
**402** | The workspace&#39;s plan allows no more of &#x60;limit&#x60;: it has &#x60;allowed&#x60; already. A larger plan, or removing some, makes room. Nothing was changed. |  -  |
**403** | The credentials are valid but do not allow this request. |  -  |
**404** | No workspace with this id is open to the caller. |  -  |
**422** | The account was not connected; &#x60;reason&#x60; says why. Nothing was saved. |  -  |
**502** | The platform did not answer, or failed on its side. Nothing was connected; try again later. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **channels_disconnect**
> channels_disconnect(workspace_id, channel_id)

Disconnect a channel

Disconnects a channel from the workspace: the channel and the tokens Peal holds for it are deleted, and nothing more is posted on it. Needs channel:disconnect.

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
    api_instance = peal.ChannelsApi(api_client)
    workspace_id = 'workspace_id_example' # str | 
    channel_id = 'channel_id_example' # str | 

    try:
        # Disconnect a channel
        api_instance.channels_disconnect(workspace_id, channel_id)
    except Exception as e:
        print("Exception when calling ChannelsApi->channels_disconnect: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **workspace_id** | **str**|  | 
 **channel_id** | **str**|  | 

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
**404** | The workspace has no channel with this id. | No workspace with this id is open to the caller. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **channels_list**
> List[Channel] channels_list(workspace_id)

List channels

Lists the channels connected to the workspace, oldest first. Their tokens are never shown. Needs channel:read.

### Example

* Bearer Authentication (bearer):

```python
import peal
from peal.models.channel import Channel
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
    api_instance = peal.ChannelsApi(api_client)
    workspace_id = 'workspace_id_example' # str | 

    try:
        # List channels
        api_response = api_instance.channels_list(workspace_id)
        print("The response of ChannelsApi->channels_list:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling ChannelsApi->channels_list: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **workspace_id** | **str**|  | 

### Return type

[**List[Channel]**](Channel.md)

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

# **channels_platforms**
> ConnectablePlatforms channels_platforms(workspace_id)

List connectable platforms

Lists the platforms this server can connect accounts of, in Peal's order. A platform that needs a setting the server lacks, such as an app registered on LinkedIn, X or Meta or a Google OAuth client, is left out. Needs channel:connect.

### Example

* Bearer Authentication (bearer):

```python
import peal
from peal.models.connectable_platforms import ConnectablePlatforms
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
    api_instance = peal.ChannelsApi(api_client)
    workspace_id = 'workspace_id_example' # str | 

    try:
        # List connectable platforms
        api_response = api_instance.channels_platforms(workspace_id)
        print("The response of ChannelsApi->channels_platforms:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling ChannelsApi->channels_platforms: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **workspace_id** | **str**|  | 

### Return type

[**ConnectablePlatforms**](ConnectablePlatforms.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | ConnectablePlatforms |  -  |
**401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
**403** | The credentials are valid but do not allow this request. |  -  |
**404** | No workspace with this id is open to the caller. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **channels_reconnect**
> Authorization channels_reconnect(workspace_id, channel_id)

Start reconnecting a channel

Starts reconnecting a channel whose token stopped working or is about to: answers with the platform's sign-in page. Completing it must sign in to the same account. A channel the workspace has takes no room in its plan, so no plan limit refuses it. Needs channel:connect.

### Example

* Bearer Authentication (bearer):

```python
import peal
from peal.models.authorization import Authorization
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
    api_instance = peal.ChannelsApi(api_client)
    workspace_id = 'workspace_id_example' # str | 
    channel_id = 'channel_id_example' # str | 

    try:
        # Start reconnecting a channel
        api_response = api_instance.channels_reconnect(workspace_id, channel_id)
        print("The response of ChannelsApi->channels_reconnect:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling ChannelsApi->channels_reconnect: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **workspace_id** | **str**|  | 
 **channel_id** | **str**|  | 

### Return type

[**Authorization**](Authorization.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Authorization |  -  |
**401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
**403** | The credentials are valid but do not allow this request. |  -  |
**404** | The workspace has no channel with this id. | No workspace with this id is open to the caller. |  -  |
**422** | The account was not connected; &#x60;reason&#x60; says why. Nothing was saved. |  -  |
**502** | The platform did not answer, or failed on its side. Nothing was connected; try again later. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

