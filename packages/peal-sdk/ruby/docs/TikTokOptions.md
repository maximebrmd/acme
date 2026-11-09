# Peal::TikTokOptions

## Properties

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **ai_generated** | **Boolean** |  | [optional] |
| **brand_content** | **Boolean** |  | [optional] |
| **brand_organic** | **Boolean** |  | [optional] |
| **commercial_content** | **Boolean** |  | [optional] |
| **disable_comment** | **Boolean** |  | [optional] |
| **disable_duet** | **Boolean** |  | [optional] |
| **disable_stitch** | **Boolean** |  | [optional] |
| **platform** | **String** |  |  |
| **privacy_level** | [**TikTokPrivacyLevel**](TikTokPrivacyLevel.md) |  | [optional] |

## Example

```ruby
require 'peal'

instance = Peal::TikTokOptions.new(
  ai_generated: null,
  brand_content: null,
  brand_organic: null,
  commercial_content: null,
  disable_comment: null,
  disable_duet: null,
  disable_stitch: null,
  platform: null,
  privacy_level: null
)
```

