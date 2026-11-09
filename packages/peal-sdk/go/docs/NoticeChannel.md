# NoticeChannel

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Handle** | **string** |  | 
**Platform** | [**Platform**](Platform.md) |  | 

## Methods

### NewNoticeChannel

`func NewNoticeChannel(handle string, platform Platform, ) *NoticeChannel`

NewNoticeChannel instantiates a new NoticeChannel object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewNoticeChannelWithDefaults

`func NewNoticeChannelWithDefaults() *NoticeChannel`

NewNoticeChannelWithDefaults instantiates a new NoticeChannel object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetHandle

`func (o *NoticeChannel) GetHandle() string`

GetHandle returns the Handle field if non-nil, zero value otherwise.

### GetHandleOk

`func (o *NoticeChannel) GetHandleOk() (*string, bool)`

GetHandleOk returns a tuple with the Handle field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetHandle

`func (o *NoticeChannel) SetHandle(v string)`

SetHandle sets Handle field to given value.


### GetPlatform

`func (o *NoticeChannel) GetPlatform() Platform`

GetPlatform returns the Platform field if non-nil, zero value otherwise.

### GetPlatformOk

`func (o *NoticeChannel) GetPlatformOk() (*Platform, bool)`

GetPlatformOk returns a tuple with the Platform field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPlatform

`func (o *NoticeChannel) SetPlatform(v Platform)`

SetPlatform sets Platform field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


