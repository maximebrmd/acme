# Peal::PostTarget

## Properties

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **channel_id** | **String** |  |  |
| **failure_reason** | [**FailureReason**](FailureReason.md) |  |  |
| **id** | **String** |  |  |
| **kept_private** | **Boolean** |  | [optional] |
| **options** | [**TargetOptions**](TargetOptions.md) |  |  |
| **permalink** | **String** |  |  |
| **published_at** | **String** |  |  |
| **round** | **Integer** |  |  |
| **status** | [**PostTargetStatus**](PostTargetStatus.md) |  |  |
| **unconfirmed_reason** | [**UnconfirmedReason**](UnconfirmedReason.md) |  |  |

## Example

```ruby
require 'peal'

instance = Peal::PostTarget.new(
  channel_id: null,
  failure_reason: null,
  id: null,
  kept_private: null,
  options: null,
  permalink: null,
  published_at: null,
  round: null,
  status: null,
  unconfirmed_reason: null
)
```

