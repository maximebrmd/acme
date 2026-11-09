# Peal::AssistantApi

All URIs are relative to *https://app.peal.social*

| Method | HTTP request | Description |
| ------ | ------------ | ----------- |
| [**assistant_status**](AssistantApi.md#assistant_status) | **GET** /api/workspaces/{workspaceId}/assistant | Get the assistant&#39;s status |
| [**assistant_suggest**](AssistantApi.md#assistant_suggest) | **POST** /api/workspaces/{workspaceId}/assistant/suggestions | Suggest a change to a post&#39;s text |


## assistant_status

> <AssistantStatus> assistant_status(workspace_id)

Get the assistant's status

Tells whether the server has a language model, so clients show the assistant or hide it, and how many requests the workspace has left today. Needs assistant:use.

### Examples

```ruby
require 'time'
require 'peal'
# setup authorization
Peal.configure do |config|
  # Configure Bearer authorization: bearer
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = Peal::AssistantApi.new
workspace_id = 'workspace_id_example' # String | 

begin
  # Get the assistant's status
  result = api_instance.assistant_status(workspace_id)
  p result
rescue Peal::ApiError => e
  puts "Error when calling AssistantApi->assistant_status: #{e}"
end
```

#### Using the assistant_status_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<AssistantStatus>, Integer, Hash)> assistant_status_with_http_info(workspace_id)

```ruby
begin
  # Get the assistant's status
  data, status_code, headers = api_instance.assistant_status_with_http_info(workspace_id)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <AssistantStatus>
rescue Peal::ApiError => e
  puts "Error when calling AssistantApi->assistant_status_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **workspace_id** | **String** |  |  |

### Return type

[**AssistantStatus**](AssistantStatus.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## assistant_suggest

> <Suggestion> assistant_suggest(workspace_id, suggestion_request)

Suggest a change to a post's text

Asks the language model to rewrite, shorten or translate a post's text, or to suggest hashtags for it, and answers once the whole suggestion is checked. The text is sent to the model as data, never as instructions. Each request counts toward the workspace's daily quota, unless the model's provider could not be reached. Needs assistant:use.

### Examples

```ruby
require 'time'
require 'peal'
# setup authorization
Peal.configure do |config|
  # Configure Bearer authorization: bearer
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = Peal::AssistantApi.new
workspace_id = 'workspace_id_example' # String | 
suggestion_request = Peal::SuggestionRequest.new({action: Peal::AssistantAction.new({_tag: 'hashtags', tone: Peal::AssistantTone::PROFESSIONAL, platform: Peal::Platform::X, language: Peal::TranslationLanguage::EN}), text: 'text_example'}) # SuggestionRequest | 

begin
  # Suggest a change to a post's text
  result = api_instance.assistant_suggest(workspace_id, suggestion_request)
  p result
rescue Peal::ApiError => e
  puts "Error when calling AssistantApi->assistant_suggest: #{e}"
end
```

#### Using the assistant_suggest_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<Suggestion>, Integer, Hash)> assistant_suggest_with_http_info(workspace_id, suggestion_request)

```ruby
begin
  # Suggest a change to a post's text
  data, status_code, headers = api_instance.assistant_suggest_with_http_info(workspace_id, suggestion_request)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <Suggestion>
rescue Peal::ApiError => e
  puts "Error when calling AssistantApi->assistant_suggest_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **workspace_id** | **String** |  |  |
| **suggestion_request** | [**SuggestionRequest**](SuggestionRequest.md) |  |  |

### Return type

[**Suggestion**](Suggestion.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

