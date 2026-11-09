# Peal::YouTubeOptions

## Properties

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **category_id** | **String** |  | [optional] |
| **contains_synthetic_media** | **Boolean** |  | [optional] |
| **made_for_kids** | **Boolean** |  | [optional] |
| **notify_subscribers** | **Boolean** |  | [optional] |
| **platform** | **String** |  |  |
| **privacy** | [**YouTubePrivacy**](YouTubePrivacy.md) |  | [optional] |
| **tags** | **Array&lt;String&gt;** |  | [optional] |
| **title** | **String** |  | [optional] |

## Example

```ruby
require 'peal'

instance = Peal::YouTubeOptions.new(
  category_id: null,
  contains_synthetic_media: null,
  made_for_kids: null,
  notify_subscribers: null,
  platform: null,
  privacy: null,
  tags: null,
  title: null
)
```

