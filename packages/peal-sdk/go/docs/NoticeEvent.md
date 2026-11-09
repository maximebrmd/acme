# NoticeEvent

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Tag** | **string** |  | 
**Channel** | [**NoticeChannel**](NoticeChannel.md) |  | 
**Permalink** | **NullableString** |  | 
**PostId** | **string** |  | 
**Reason** | [**FailureReason**](FailureReason.md) |  | 
**ExpiresAt** | **string** |  | 

## Methods

### NewNoticeEvent

`func NewNoticeEvent(tag string, channel NoticeChannel, permalink NullableString, postId string, reason FailureReason, expiresAt string, ) *NoticeEvent`

NewNoticeEvent instantiates a new NoticeEvent object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewNoticeEventWithDefaults

`func NewNoticeEventWithDefaults() *NoticeEvent`

NewNoticeEventWithDefaults instantiates a new NoticeEvent object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTag

`func (o *NoticeEvent) GetTag() string`

GetTag returns the Tag field if non-nil, zero value otherwise.

### GetTagOk

`func (o *NoticeEvent) GetTagOk() (*string, bool)`

GetTagOk returns a tuple with the Tag field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTag

`func (o *NoticeEvent) SetTag(v string)`

SetTag sets Tag field to given value.


### GetChannel

`func (o *NoticeEvent) GetChannel() NoticeChannel`

GetChannel returns the Channel field if non-nil, zero value otherwise.

### GetChannelOk

`func (o *NoticeEvent) GetChannelOk() (*NoticeChannel, bool)`

GetChannelOk returns a tuple with the Channel field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetChannel

`func (o *NoticeEvent) SetChannel(v NoticeChannel)`

SetChannel sets Channel field to given value.


### GetPermalink

`func (o *NoticeEvent) GetPermalink() string`

GetPermalink returns the Permalink field if non-nil, zero value otherwise.

### GetPermalinkOk

`func (o *NoticeEvent) GetPermalinkOk() (*string, bool)`

GetPermalinkOk returns a tuple with the Permalink field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPermalink

`func (o *NoticeEvent) SetPermalink(v string)`

SetPermalink sets Permalink field to given value.


### SetPermalinkNil

`func (o *NoticeEvent) SetPermalinkNil(b bool)`

 SetPermalinkNil sets the value for Permalink to be an explicit nil

### UnsetPermalink
`func (o *NoticeEvent) UnsetPermalink()`

UnsetPermalink ensures that no value is present for Permalink, not even an explicit nil
### GetPostId

`func (o *NoticeEvent) GetPostId() string`

GetPostId returns the PostId field if non-nil, zero value otherwise.

### GetPostIdOk

`func (o *NoticeEvent) GetPostIdOk() (*string, bool)`

GetPostIdOk returns a tuple with the PostId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPostId

`func (o *NoticeEvent) SetPostId(v string)`

SetPostId sets PostId field to given value.


### GetReason

`func (o *NoticeEvent) GetReason() FailureReason`

GetReason returns the Reason field if non-nil, zero value otherwise.

### GetReasonOk

`func (o *NoticeEvent) GetReasonOk() (*FailureReason, bool)`

GetReasonOk returns a tuple with the Reason field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetReason

`func (o *NoticeEvent) SetReason(v FailureReason)`

SetReason sets Reason field to given value.


### GetExpiresAt

`func (o *NoticeEvent) GetExpiresAt() string`

GetExpiresAt returns the ExpiresAt field if non-nil, zero value otherwise.

### GetExpiresAtOk

`func (o *NoticeEvent) GetExpiresAtOk() (*string, bool)`

GetExpiresAtOk returns a tuple with the ExpiresAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetExpiresAt

`func (o *NoticeEvent) SetExpiresAt(v string)`

SetExpiresAt sets ExpiresAt field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


