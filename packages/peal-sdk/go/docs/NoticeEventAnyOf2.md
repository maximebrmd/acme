# NoticeEventAnyOf2

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Tag** | **string** |  | 
**Channel** | [**NullableNoticeChannel**](NoticeChannel.md) |  | 
**PostId** | **string** |  | 

## Methods

### NewNoticeEventAnyOf2

`func NewNoticeEventAnyOf2(tag string, channel NullableNoticeChannel, postId string, ) *NoticeEventAnyOf2`

NewNoticeEventAnyOf2 instantiates a new NoticeEventAnyOf2 object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewNoticeEventAnyOf2WithDefaults

`func NewNoticeEventAnyOf2WithDefaults() *NoticeEventAnyOf2`

NewNoticeEventAnyOf2WithDefaults instantiates a new NoticeEventAnyOf2 object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTag

`func (o *NoticeEventAnyOf2) GetTag() string`

GetTag returns the Tag field if non-nil, zero value otherwise.

### GetTagOk

`func (o *NoticeEventAnyOf2) GetTagOk() (*string, bool)`

GetTagOk returns a tuple with the Tag field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTag

`func (o *NoticeEventAnyOf2) SetTag(v string)`

SetTag sets Tag field to given value.


### GetChannel

`func (o *NoticeEventAnyOf2) GetChannel() NoticeChannel`

GetChannel returns the Channel field if non-nil, zero value otherwise.

### GetChannelOk

`func (o *NoticeEventAnyOf2) GetChannelOk() (*NoticeChannel, bool)`

GetChannelOk returns a tuple with the Channel field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetChannel

`func (o *NoticeEventAnyOf2) SetChannel(v NoticeChannel)`

SetChannel sets Channel field to given value.


### SetChannelNil

`func (o *NoticeEventAnyOf2) SetChannelNil(b bool)`

 SetChannelNil sets the value for Channel to be an explicit nil

### UnsetChannel
`func (o *NoticeEventAnyOf2) UnsetChannel()`

UnsetChannel ensures that no value is present for Channel, not even an explicit nil
### GetPostId

`func (o *NoticeEventAnyOf2) GetPostId() string`

GetPostId returns the PostId field if non-nil, zero value otherwise.

### GetPostIdOk

`func (o *NoticeEventAnyOf2) GetPostIdOk() (*string, bool)`

GetPostIdOk returns a tuple with the PostId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPostId

`func (o *NoticeEventAnyOf2) SetPostId(v string)`

SetPostId sets PostId field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


