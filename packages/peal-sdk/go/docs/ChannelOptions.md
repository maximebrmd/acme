# ChannelOptions

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**ChannelId** | **string** |  | 
**Options** | [**TargetOptions**](TargetOptions.md) |  | 

## Methods

### NewChannelOptions

`func NewChannelOptions(channelId string, options TargetOptions, ) *ChannelOptions`

NewChannelOptions instantiates a new ChannelOptions object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewChannelOptionsWithDefaults

`func NewChannelOptionsWithDefaults() *ChannelOptions`

NewChannelOptionsWithDefaults instantiates a new ChannelOptions object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetChannelId

`func (o *ChannelOptions) GetChannelId() string`

GetChannelId returns the ChannelId field if non-nil, zero value otherwise.

### GetChannelIdOk

`func (o *ChannelOptions) GetChannelIdOk() (*string, bool)`

GetChannelIdOk returns a tuple with the ChannelId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetChannelId

`func (o *ChannelOptions) SetChannelId(v string)`

SetChannelId sets ChannelId field to given value.


### GetOptions

`func (o *ChannelOptions) GetOptions() TargetOptions`

GetOptions returns the Options field if non-nil, zero value otherwise.

### GetOptionsOk

`func (o *ChannelOptions) GetOptionsOk() (*TargetOptions, bool)`

GetOptionsOk returns a tuple with the Options field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetOptions

`func (o *ChannelOptions) SetOptions(v TargetOptions)`

SetOptions sets Options field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


