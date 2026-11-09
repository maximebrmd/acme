# Peal::ContentViolation

## Properties

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **_tag** | **String** |  |  |
| **channel_id** | **String** |  |  |
| **platform** | [**Platform**](Platform.md) |  |  |
| **options_platform** | [**Platform**](Platform.md) |  |  |
| **field** | **String** |  |  |
| **length** | **Integer** |  |  |
| **maximum** | **Integer** |  |  |
| **unit** | [**TextUnit**](TextUnit.md) |  |  |
| **characters** | **Array&lt;String&gt;** |  |  |
| **count** | **Integer** |  |  |
| **media_id** | **String** |  |  |
| **content_type** | [**MediaContentType**](MediaContentType.md) |  |  |
| **byte_size** | **Integer** |  |  |
| **minimum** | [**ContentViolationAnyOf24Maximum**](ContentViolationAnyOf24Maximum.md) |  |  |
| **duration_ms** | **Integer** |  |  |
| **maximum_ms** | **Integer** |  |  |
| **minimum_ms** | **Integer** |  |  |
| **height** | **Integer** |  |  |
| **width** | **Integer** |  |  |

## Example

```ruby
require 'peal'

instance = Peal::ContentViolation.new(
  _tag: null,
  channel_id: null,
  platform: null,
  options_platform: null,
  field: null,
  length: null,
  maximum: null,
  unit: null,
  characters: null,
  count: null,
  media_id: null,
  content_type: null,
  byte_size: null,
  minimum: null,
  duration_ms: null,
  maximum_ms: null,
  minimum_ms: null,
  height: null,
  width: null
)
```

