# Peal::PublicationAttempt

## Properties

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **attempt** | **Integer** |  |  |
| **finished_at** | **String** |  |  |
| **result** | [**AttemptResult**](AttemptResult.md) |  |  |
| **retry_at** | **String** |  |  |
| **round** | **Integer** |  |  |
| **started_at** | **String** |  |  |
| **target_id** | **String** |  |  |

## Example

```ruby
require 'peal'

instance = Peal::PublicationAttempt.new(
  attempt: null,
  finished_at: null,
  result: null,
  retry_at: null,
  round: null,
  started_at: null,
  target_id: null
)
```

