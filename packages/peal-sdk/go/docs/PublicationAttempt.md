# PublicationAttempt

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Attempt** | **int32** |  | 
**FinishedAt** | **string** |  | 
**Result** | [**AttemptResult**](AttemptResult.md) |  | 
**RetryAt** | **NullableString** |  | 
**Round** | **int32** |  | 
**StartedAt** | **string** |  | 
**TargetId** | **string** |  | 

## Methods

### NewPublicationAttempt

`func NewPublicationAttempt(attempt int32, finishedAt string, result AttemptResult, retryAt NullableString, round int32, startedAt string, targetId string, ) *PublicationAttempt`

NewPublicationAttempt instantiates a new PublicationAttempt object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewPublicationAttemptWithDefaults

`func NewPublicationAttemptWithDefaults() *PublicationAttempt`

NewPublicationAttemptWithDefaults instantiates a new PublicationAttempt object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetAttempt

`func (o *PublicationAttempt) GetAttempt() int32`

GetAttempt returns the Attempt field if non-nil, zero value otherwise.

### GetAttemptOk

`func (o *PublicationAttempt) GetAttemptOk() (*int32, bool)`

GetAttemptOk returns a tuple with the Attempt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAttempt

`func (o *PublicationAttempt) SetAttempt(v int32)`

SetAttempt sets Attempt field to given value.


### GetFinishedAt

`func (o *PublicationAttempt) GetFinishedAt() string`

GetFinishedAt returns the FinishedAt field if non-nil, zero value otherwise.

### GetFinishedAtOk

`func (o *PublicationAttempt) GetFinishedAtOk() (*string, bool)`

GetFinishedAtOk returns a tuple with the FinishedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFinishedAt

`func (o *PublicationAttempt) SetFinishedAt(v string)`

SetFinishedAt sets FinishedAt field to given value.


### GetResult

`func (o *PublicationAttempt) GetResult() AttemptResult`

GetResult returns the Result field if non-nil, zero value otherwise.

### GetResultOk

`func (o *PublicationAttempt) GetResultOk() (*AttemptResult, bool)`

GetResultOk returns a tuple with the Result field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetResult

`func (o *PublicationAttempt) SetResult(v AttemptResult)`

SetResult sets Result field to given value.


### GetRetryAt

`func (o *PublicationAttempt) GetRetryAt() string`

GetRetryAt returns the RetryAt field if non-nil, zero value otherwise.

### GetRetryAtOk

`func (o *PublicationAttempt) GetRetryAtOk() (*string, bool)`

GetRetryAtOk returns a tuple with the RetryAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRetryAt

`func (o *PublicationAttempt) SetRetryAt(v string)`

SetRetryAt sets RetryAt field to given value.


### SetRetryAtNil

`func (o *PublicationAttempt) SetRetryAtNil(b bool)`

 SetRetryAtNil sets the value for RetryAt to be an explicit nil

### UnsetRetryAt
`func (o *PublicationAttempt) UnsetRetryAt()`

UnsetRetryAt ensures that no value is present for RetryAt, not even an explicit nil
### GetRound

`func (o *PublicationAttempt) GetRound() int32`

GetRound returns the Round field if non-nil, zero value otherwise.

### GetRoundOk

`func (o *PublicationAttempt) GetRoundOk() (*int32, bool)`

GetRoundOk returns a tuple with the Round field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRound

`func (o *PublicationAttempt) SetRound(v int32)`

SetRound sets Round field to given value.


### GetStartedAt

`func (o *PublicationAttempt) GetStartedAt() string`

GetStartedAt returns the StartedAt field if non-nil, zero value otherwise.

### GetStartedAtOk

`func (o *PublicationAttempt) GetStartedAtOk() (*string, bool)`

GetStartedAtOk returns a tuple with the StartedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStartedAt

`func (o *PublicationAttempt) SetStartedAt(v string)`

SetStartedAt sets StartedAt field to given value.


### GetTargetId

`func (o *PublicationAttempt) GetTargetId() string`

GetTargetId returns the TargetId field if non-nil, zero value otherwise.

### GetTargetIdOk

`func (o *PublicationAttempt) GetTargetIdOk() (*string, bool)`

GetTargetIdOk returns a tuple with the TargetId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTargetId

`func (o *PublicationAttempt) SetTargetId(v string)`

SetTargetId sets TargetId field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


