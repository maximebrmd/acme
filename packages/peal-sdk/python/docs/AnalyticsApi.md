# peal.AnalyticsApi

All URIs are relative to *https://app.peal.social*

Method | HTTP request | Description
------------- | ------------- | -------------
[**analytics_post**](AnalyticsApi.md#analytics_post) | **GET** /api/workspaces/{workspaceId}/analytics/posts/{postId} | Get a post&#39;s analytics
[**analytics_summary**](AnalyticsApi.md#analytics_summary) | **GET** /api/workspaces/{workspaceId}/analytics/summary | Summarize the workspace&#39;s analytics


# **analytics_post**
> PostAnalytics analytics_post(workspace_id, post_id)

Get a post's analytics

Answers with the counts of a post on each channel it went live on, over time. A post not published yet, or whose counts were not read yet, has no targets. Needs analytics:read.

### Example

* Bearer Authentication (bearer):

```python
import peal
from peal.models.post_analytics import PostAnalytics
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
    api_instance = peal.AnalyticsApi(api_client)
    workspace_id = 'workspace_id_example' # str | 
    post_id = 'post_id_example' # str | 

    try:
        # Get a post's analytics
        api_response = api_instance.analytics_post(workspace_id, post_id)
        print("The response of AnalyticsApi->analytics_post:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling AnalyticsApi->analytics_post: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **workspace_id** | **str**|  | 
 **post_id** | **str**|  | 

### Return type

[**PostAnalytics**](PostAnalytics.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | PostAnalytics |  -  |
**401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
**403** | The credentials are valid but do not allow this request. |  -  |
**404** | No workspace with this id is open to the caller. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **analytics_summary**
> AnalyticsSummary analytics_summary(workspace_id, var_from, time_zone, to)

Summarize the workspace's analytics

Sums up the posts published from `from` to `to`, both included and at most 366 days, as days run in `timeZone` (an IANA zone such as Europe/Paris): their latest counts in all and by channel, what they gained each day, and the five with the most engagement (likes, reposts, replies and quotes). Counts are read from the platforms every hour for 48 hours after a post goes live, then every day until it is 30 days old. Needs analytics:read.

### Example

* Bearer Authentication (bearer):

```python
import peal
from peal.models.analytics_summary import AnalyticsSummary
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
    api_instance = peal.AnalyticsApi(api_client)
    workspace_id = 'workspace_id_example' # str | 
    var_from = 'var_from_example' # str | 
    time_zone = 'time_zone_example' # str | 
    to = 'to_example' # str | 

    try:
        # Summarize the workspace's analytics
        api_response = api_instance.analytics_summary(workspace_id, var_from, time_zone, to)
        print("The response of AnalyticsApi->analytics_summary:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling AnalyticsApi->analytics_summary: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **workspace_id** | **str**|  | 
 **var_from** | **str**|  | 
 **time_zone** | **str**|  | 
 **to** | **str**|  | 

### Return type

[**AnalyticsSummary**](AnalyticsSummary.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | AnalyticsSummary |  -  |
**400** | The range of days ends before it starts, or spans more than 366 days. |  -  |
**401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
**403** | The credentials are valid but do not allow this request. |  -  |
**404** | No workspace with this id is open to the caller. |  -  |
**422** | The time zone is not an IANA time zone such as Europe/Paris. Offsets such as +01:00 are refused. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

