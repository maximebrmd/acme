# NoticeEventAnyOf1

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Tag** | **string** |  | 
**Channel** | [**NullableNoticeChannel**](NoticeChannel.md) |  | 
**PostId** | **string** |  | 
**Reason** | [**FailureReason**](FailureReason.md) |  | 

## Methods

### NewNoticeEventAnyOf1

`func NewNoticeEventAnyOf1(tag string, channel NullableNoticeChannel, postId string, reason FailureReason, ) *NoticeEventAnyOf1`

NewNoticeEventAnyOf1 instantiates a new NoticeEventAnyOf1 object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewNoticeEventAnyOf1WithDefaults

`func NewNoticeEventAnyOf1WithDefaults() *NoticeEventAnyOf1`

NewNoticeEventAnyOf1WithDefaults instantiates a new NoticeEventAnyOf1 object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTag

`func (o *NoticeEventAnyOf1) GetTag() string`

GetTag returns the Tag field if non-nil, zero value otherwise.

### GetTagOk

`func (o *NoticeEventAnyOf1) GetTagOk() (*string, bool)`

GetTagOk returns a tuple with the Tag field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTag

`func (o *NoticeEventAnyOf1) SetTag(v string)`

SetTag sets Tag field to given value.


### GetChannel

`func (o *NoticeEventAnyOf1) GetChannel() NoticeChannel`

GetChannel returns the Channel field if non-nil, zero value otherwise.

### GetChannelOk

`func (o *NoticeEventAnyOf1) GetChannelOk() (*NoticeChannel, bool)`

GetChannelOk returns a tuple with the Channel field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetChannel

`func (o *NoticeEventAnyOf1) SetChannel(v NoticeChannel)`

SetChannel sets Channel field to given value.


### SetChannelNil

`func (o *NoticeEventAnyOf1) SetChannelNil(b bool)`

 SetChannelNil sets the value for Channel to be an explicit nil

### UnsetChannel
`func (o *NoticeEventAnyOf1) UnsetChannel()`

UnsetChannel ensures that no value is present for Channel, not even an explicit nil
### GetPostId

`func (o *NoticeEventAnyOf1) GetPostId() string`

GetPostId returns the PostId field if non-nil, zero value otherwise.

### GetPostIdOk

`func (o *NoticeEventAnyOf1) GetPostIdOk() (*string, bool)`

GetPostIdOk returns a tuple with the PostId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPostId

`func (o *NoticeEventAnyOf1) SetPostId(v string)`

SetPostId sets PostId field to given value.


### GetReason

`func (o *NoticeEventAnyOf1) GetReason() FailureReason`

GetReason returns the Reason field if non-nil, zero value otherwise.

### GetReasonOk

`func (o *NoticeEventAnyOf1) GetReasonOk() (*FailureReason, bool)`

GetReasonOk returns a tuple with the Reason field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetReason

`func (o *NoticeEventAnyOf1) SetReason(v FailureReason)`

SetReason sets Reason field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


