# ChannelStatus

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Tag** | **string** |  | 
**RefreshNeeded** | **bool** |  | 

## Methods

### NewChannelStatus

`func NewChannelStatus(tag string, refreshNeeded bool, ) *ChannelStatus`

NewChannelStatus instantiates a new ChannelStatus object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewChannelStatusWithDefaults

`func NewChannelStatusWithDefaults() *ChannelStatus`

NewChannelStatusWithDefaults instantiates a new ChannelStatus object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTag

`func (o *ChannelStatus) GetTag() string`

GetTag returns the Tag field if non-nil, zero value otherwise.

### GetTagOk

`func (o *ChannelStatus) GetTagOk() (*string, bool)`

GetTagOk returns a tuple with the Tag field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTag

`func (o *ChannelStatus) SetTag(v string)`

SetTag sets Tag field to given value.


### GetRefreshNeeded

`func (o *ChannelStatus) GetRefreshNeeded() bool`

GetRefreshNeeded returns the RefreshNeeded field if non-nil, zero value otherwise.

### GetRefreshNeededOk

`func (o *ChannelStatus) GetRefreshNeededOk() (*bool, bool)`

GetRefreshNeededOk returns a tuple with the RefreshNeeded field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRefreshNeeded

`func (o *ChannelStatus) SetRefreshNeeded(v bool)`

SetRefreshNeeded sets RefreshNeeded field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


