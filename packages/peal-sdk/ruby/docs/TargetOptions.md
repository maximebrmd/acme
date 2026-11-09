# Peal::TargetOptions

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
| **ai_generated** | **Boolean** |  | [optional] |
| **brand_content** | **Boolean** |  | [optional] |
| **brand_organic** | **Boolean** |  | [optional] |
| **commercial_content** | **Boolean** |  | [optional] |
| **disable_comment** | **Boolean** |  | [optional] |
| **disable_duet** | **Boolean** |  | [optional] |
| **disable_stitch** | **Boolean** |  | [optional] |
| **privacy_level** | [**TikTokPrivacyLevel**](TikTokPrivacyLevel.md) |  | [optional] |

## Example

```ruby
require 'peal'

instance = Peal::TargetOptions.new(
  category_id: null,
  contains_synthetic_media: null,
  made_for_kids: null,
  notify_subscribers: null,
  platform: null,
  privacy: null,
  tags: null,
  title: null,
  ai_generated: null,
  brand_content: null,
  brand_organic: null,
  commercial_content: null,
  disable_comment: null,
  disable_duet: null,
  disable_stitch: null,
  privacy_level: null
)
```

