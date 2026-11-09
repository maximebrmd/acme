# \AnalyticsApi

All URIs are relative to *https://app.peal.social*

Method | HTTP request | Description
------------- | ------------- | -------------
[**analytics_post**](AnalyticsApi.md#analytics_post) | **GET** /api/workspaces/{workspaceId}/analytics/posts/{postId} | Get a post's analytics
[**analytics_summary**](AnalyticsApi.md#analytics_summary) | **GET** /api/workspaces/{workspaceId}/analytics/summary | Summarize the workspace's analytics



## analytics_post

> models::PostAnalytics analytics_post(workspace_id, post_id)
Get a post's analytics

Answers with the counts of a post on each channel it went live on, over time. A post not published yet, or whose counts were not read yet, has no targets. Needs analytics:read.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**workspace_id** | **String** |  | [required] |
**post_id** | **String** |  | [required] |

### Return type

[**models::PostAnalytics**](PostAnalytics.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## analytics_summary

> models::AnalyticsSummary analytics_summary(workspace_id, from, time_zone, to)
Summarize the workspace's analytics

Sums up the posts published from `from` to `to`, both included and at most 366 days, as days run in `timeZone` (an IANA zone such as Europe/Paris): their latest counts in all and by channel, what they gained each day, and the five with the most engagement (likes, reposts, replies and quotes). Counts are read from the platforms every hour for 48 hours after a post goes live, then every day until it is 30 days old. Needs analytics:read.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**workspace_id** | **String** |  | [required] |
**from** | **String** |  | [required] |
**time_zone** | **String** |  | [required] |
**to** | **String** |  | [required] |

### Return type

[**models::AnalyticsSummary**](AnalyticsSummary.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

