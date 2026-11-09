# AssistantStatus

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Available** | **bool** |  | 
**DailyLimit** | **int32** |  | 
**MaxTextLength** | **int32** |  | 
**Remaining** | **int32** |  | 
**ResetsAt** | **string** |  | 

## Methods

### NewAssistantStatus

`func NewAssistantStatus(available bool, dailyLimit int32, maxTextLength int32, remaining int32, resetsAt string, ) *AssistantStatus`

NewAssistantStatus instantiates a new AssistantStatus object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewAssistantStatusWithDefaults

`func NewAssistantStatusWithDefaults() *AssistantStatus`

NewAssistantStatusWithDefaults instantiates a new AssistantStatus object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetAvailable

`func (o *AssistantStatus) GetAvailable() bool`

GetAvailable returns the Available field if non-nil, zero value otherwise.

### GetAvailableOk

`func (o *AssistantStatus) GetAvailableOk() (*bool, bool)`

GetAvailableOk returns a tuple with the Available field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAvailable

`func (o *AssistantStatus) SetAvailable(v bool)`

SetAvailable sets Available field to given value.


### GetDailyLimit

`func (o *AssistantStatus) GetDailyLimit() int32`

GetDailyLimit returns the DailyLimit field if non-nil, zero value otherwise.

### GetDailyLimitOk

`func (o *AssistantStatus) GetDailyLimitOk() (*int32, bool)`

GetDailyLimitOk returns a tuple with the DailyLimit field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDailyLimit

`func (o *AssistantStatus) SetDailyLimit(v int32)`

SetDailyLimit sets DailyLimit field to given value.


### GetMaxTextLength

`func (o *AssistantStatus) GetMaxTextLength() int32`

GetMaxTextLength returns the MaxTextLength field if non-nil, zero value otherwise.

### GetMaxTextLengthOk

`func (o *AssistantStatus) GetMaxTextLengthOk() (*int32, bool)`

GetMaxTextLengthOk returns a tuple with the MaxTextLength field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMaxTextLength

`func (o *AssistantStatus) SetMaxTextLength(v int32)`

SetMaxTextLength sets MaxTextLength field to given value.


### GetRemaining

`func (o *AssistantStatus) GetRemaining() int32`

GetRemaining returns the Remaining field if non-nil, zero value otherwise.

### GetRemainingOk

`func (o *AssistantStatus) GetRemainingOk() (*int32, bool)`

GetRemainingOk returns a tuple with the Remaining field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRemaining

`func (o *AssistantStatus) SetRemaining(v int32)`

SetRemaining sets Remaining field to given value.


### GetResetsAt

`func (o *AssistantStatus) GetResetsAt() string`

GetResetsAt returns the ResetsAt field if non-nil, zero value otherwise.

### GetResetsAtOk

`func (o *AssistantStatus) GetResetsAtOk() (*string, bool)`

GetResetsAtOk returns a tuple with the ResetsAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetResetsAt

`func (o *AssistantStatus) SetResetsAt(v string)`

SetResetsAt sets ResetsAt field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


