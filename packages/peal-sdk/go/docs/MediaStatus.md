# MediaStatus

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Tag** | **string** |  | 
**Probe** | [**ProbeState**](ProbeState.md) |  | 
**Reason** | [**RejectionReason**](RejectionReason.md) |  | 

## Methods

### NewMediaStatus

`func NewMediaStatus(tag string, probe ProbeState, reason RejectionReason, ) *MediaStatus`

NewMediaStatus instantiates a new MediaStatus object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewMediaStatusWithDefaults

`func NewMediaStatusWithDefaults() *MediaStatus`

NewMediaStatusWithDefaults instantiates a new MediaStatus object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTag

`func (o *MediaStatus) GetTag() string`

GetTag returns the Tag field if non-nil, zero value otherwise.

### GetTagOk

`func (o *MediaStatus) GetTagOk() (*string, bool)`

GetTagOk returns a tuple with the Tag field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTag

`func (o *MediaStatus) SetTag(v string)`

SetTag sets Tag field to given value.


### GetProbe

`func (o *MediaStatus) GetProbe() ProbeState`

GetProbe returns the Probe field if non-nil, zero value otherwise.

### GetProbeOk

`func (o *MediaStatus) GetProbeOk() (*ProbeState, bool)`

GetProbeOk returns a tuple with the Probe field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProbe

`func (o *MediaStatus) SetProbe(v ProbeState)`

SetProbe sets Probe field to given value.


### GetReason

`func (o *MediaStatus) GetReason() RejectionReason`

GetReason returns the Reason field if non-nil, zero value otherwise.

### GetReasonOk

`func (o *MediaStatus) GetReasonOk() (*RejectionReason, bool)`

GetReasonOk returns a tuple with the Reason field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetReason

`func (o *MediaStatus) SetReason(v RejectionReason)`

SetReason sets Reason field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


