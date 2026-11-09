# peal.NoticesApi

All URIs are relative to *https://app.peal.social*

Method | HTTP request | Description
------------- | ------------- | -------------
[**notices_list**](NoticesApi.md#notices_list) | **GET** /api/me/notices | List notices
[**notices_mark_all_read**](NoticesApi.md#notices_mark_all_read) | **POST** /api/me/notices/read-all | Mark all notices read
[**notices_mark_read**](NoticesApi.md#notices_mark_read) | **POST** /api/me/notices/read | Mark notices read
[**notices_unread**](NoticesApi.md#notices_unread) | **GET** /api/me/notices/unread | Count unread notices


# **notices_list**
> NoticePage notices_list(cursor=cursor, limit=limit)

List notices

Lists the user's notices, newest first, 20 a page unless `limit` (at most 100) says otherwise. Pass the page's `nextCursor` as `cursor` for the next one. Each notice is data, for the client to write in the reader's language.

### Example

* Bearer Authentication (bearer):

```python
import peal
from peal.models.notice_page import NoticePage
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
    api_instance = peal.NoticesApi(api_client)
    cursor = 'cursor_example' # str |  (optional)
    limit = 'limit_example' # str |  (optional)

    try:
        # List notices
        api_response = api_instance.notices_list(cursor=cursor, limit=limit)
        print("The response of NoticesApi->notices_list:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling NoticesApi->notices_list: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **cursor** | **str**|  | [optional] 
 **limit** | **str**|  | [optional] 

### Return type

[**NoticePage**](NoticePage.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | NoticePage |  -  |
**400** | BadRequest |  -  |
**401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
**403** | The credentials are valid but do not allow this request. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **notices_mark_all_read**
> UnreadNotices notices_mark_all_read()

Mark all notices read

Marks every notice of the user read.

### Example

* Bearer Authentication (bearer):

```python
import peal
from peal.models.unread_notices import UnreadNotices
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
    api_instance = peal.NoticesApi(api_client)

    try:
        # Mark all notices read
        api_response = api_instance.notices_mark_all_read()
        print("The response of NoticesApi->notices_mark_all_read:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling NoticesApi->notices_mark_all_read: %s\n" % e)
```



### Parameters

This endpoint does not need any parameter.

### Return type

[**UnreadNotices**](UnreadNotices.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | UnreadNotices |  -  |
**401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
**403** | The credentials are valid but do not allow this request. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **notices_mark_read**
> UnreadNotices notices_mark_read(mark_notices_read)

Mark notices read

Marks up to 100 of the user's notices read, and answers with how many stay unread. Ids that name none of the user's notices, and notices already read, are left as they are.

### Example

* Bearer Authentication (bearer):

```python
import peal
from peal.models.mark_notices_read import MarkNoticesRead
from peal.models.unread_notices import UnreadNotices
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
    api_instance = peal.NoticesApi(api_client)
    mark_notices_read = peal.MarkNoticesRead() # MarkNoticesRead | 

    try:
        # Mark notices read
        api_response = api_instance.notices_mark_read(mark_notices_read)
        print("The response of NoticesApi->notices_mark_read:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling NoticesApi->notices_mark_read: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **mark_notices_read** | [**MarkNoticesRead**](MarkNoticesRead.md)|  | 

### Return type

[**UnreadNotices**](UnreadNotices.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | UnreadNotices |  -  |
**401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
**403** | The credentials are valid but do not allow this request. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **notices_unread**
> UnreadNotices notices_unread()

Count unread notices

Counts the user's unread notices.

### Example

* Bearer Authentication (bearer):

```python
import peal
from peal.models.unread_notices import UnreadNotices
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
    api_instance = peal.NoticesApi(api_client)

    try:
        # Count unread notices
        api_response = api_instance.notices_unread()
        print("The response of NoticesApi->notices_unread:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling NoticesApi->notices_unread: %s\n" % e)
```



### Parameters

This endpoint does not need any parameter.

### Return type

[**UnreadNotices**](UnreadNotices.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | UnreadNotices |  -  |
**401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
**403** | The credentials are valid but do not allow this request. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

