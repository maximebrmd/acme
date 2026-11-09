
# NonFiniteNumber

A number JSON cannot hold: infinity, negative infinity or not a number.

## Properties

Name | Type
------------ | -------------

## Example

```typescript
import type { NonFiniteNumber } from 'peal-sdk'

// TODO: Update the object below with actual values
const example = {
} satisfies NonFiniteNumber

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as NonFiniteNumber
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


