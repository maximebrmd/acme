# Peal::AnalyticsApi

All URIs are relative to *https://app.peal.social*

| Method | HTTP request | Description |
| ------ | ------------ | ----------- |
| [**analytics_post**](AnalyticsApi.md#analytics_post) | **GET** /api/workspaces/{workspaceId}/analytics/posts/{postId} | Get a post&#39;s analytics |
| [**analytics_summary**](AnalyticsApi.md#analytics_summary) | **GET** /api/workspaces/{workspaceId}/analytics/summary | Summarize the workspace&#39;s analytics |


## analytics_post

> <PostAnalytics> analytics_post(workspace_id, post_id)

Get a post's analytics

Answers with the counts of a post on each channel it went live on, over time. A post not published yet, or whose counts were not read yet, has no targets. Needs analytics:read.

### Examples

```ruby
require 'time'
require 'peal'
# setup authorization
Peal.configure do |config|
  # Configure Bearer authorization: bearer
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = Peal::AnalyticsApi.new
workspace_id = 'workspace_id_example' # String | 
post_id = 'post_id_example' # String | 

begin
  # Get a post's analytics
  result = api_instance.analytics_post(workspace_id, post_id)
  p result
rescue Peal::ApiError => e
  puts "Error when calling AnalyticsApi->analytics_post: #{e}"
end
```

#### Using the analytics_post_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<PostAnalytics>, Integer, Hash)> analytics_post_with_http_info(workspace_id, post_id)

```ruby
begin
  # Get a post's analytics
  data, status_code, headers = api_instance.analytics_post_with_http_info(workspace_id, post_id)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <PostAnalytics>
rescue Peal::ApiError => e
  puts "Error when calling AnalyticsApi->analytics_post_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **workspace_id** | **String** |  |  |
| **post_id** | **String** |  |  |

### Return type

[**PostAnalytics**](PostAnalytics.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## analytics_summary

> <AnalyticsSummary> analytics_summary(workspace_id, from, time_zone, to)

Summarize the workspace's analytics

Sums up the posts published from `from` to `to`, both included and at most 366 days, as days run in `timeZone` (an IANA zone such as Europe/Paris): their latest counts in all and by channel, what they gained each day, and the five with the most engagement (likes, reposts, replies and quotes). Counts are read from the platforms every hour for 48 hours after a post goes live, then every day until it is 30 days old. Needs analytics:read.

### Examples

```ruby
require 'time'
require 'peal'
# setup authorization
Peal.configure do |config|
  # Configure Bearer authorization: bearer
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = Peal::AnalyticsApi.new
workspace_id = 'workspace_id_example' # String | 
from = 'from_example' # String | 
time_zone = 'time_zone_example' # String | 
to = 'to_example' # String | 

begin
  # Summarize the workspace's analytics
  result = api_instance.analytics_summary(workspace_id, from, time_zone, to)
  p result
rescue Peal::ApiError => e
  puts "Error when calling AnalyticsApi->analytics_summary: #{e}"
end
```

#### Using the analytics_summary_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<AnalyticsSummary>, Integer, Hash)> analytics_summary_with_http_info(workspace_id, from, time_zone, to)

```ruby
begin
  # Summarize the workspace's analytics
  data, status_code, headers = api_instance.analytics_summary_with_http_info(workspace_id, from, time_zone, to)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <AnalyticsSummary>
rescue Peal::ApiError => e
  puts "Error when calling AnalyticsApi->analytics_summary_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **workspace_id** | **String** |  |  |
| **from** | **String** |  |  |
| **time_zone** | **String** |  |  |
| **to** | **String** |  |  |

### Return type

[**AnalyticsSummary**](AnalyticsSummary.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

