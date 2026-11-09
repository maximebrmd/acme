# NoticeEventAnyOf

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Tag** | **string** |  | 
**Channel** | [**NullableNoticeChannel**](NoticeChannel.md) |  | 
**Permalink** | **NullableString** |  | 
**PostId** | **string** |  | 

## Methods

### NewNoticeEventAnyOf

`func NewNoticeEventAnyOf(tag string, channel NullableNoticeChannel, permalink NullableString, postId string, ) *NoticeEventAnyOf`

NewNoticeEventAnyOf instantiates a new NoticeEventAnyOf object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewNoticeEventAnyOfWithDefaults

`func NewNoticeEventAnyOfWithDefaults() *NoticeEventAnyOf`

NewNoticeEventAnyOfWithDefaults instantiates a new NoticeEventAnyOf object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTag

`func (o *NoticeEventAnyOf) GetTag() string`

GetTag returns the Tag field if non-nil, zero value otherwise.

### GetTagOk

`func (o *NoticeEventAnyOf) GetTagOk() (*string, bool)`

GetTagOk returns a tuple with the Tag field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTag

`func (o *NoticeEventAnyOf) SetTag(v string)`

SetTag sets Tag field to given value.


### GetChannel

`func (o *NoticeEventAnyOf) GetChannel() NoticeChannel`

GetChannel returns the Channel field if non-nil, zero value otherwise.

### GetChannelOk

`func (o *NoticeEventAnyOf) GetChannelOk() (*NoticeChannel, bool)`

GetChannelOk returns a tuple with the Channel field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetChannel

`func (o *NoticeEventAnyOf) SetChannel(v NoticeChannel)`

SetChannel sets Channel field to given value.


### SetChannelNil

`func (o *NoticeEventAnyOf) SetChannelNil(b bool)`

 SetChannelNil sets the value for Channel to be an explicit nil

### UnsetChannel
`func (o *NoticeEventAnyOf) UnsetChannel()`

UnsetChannel ensures that no value is present for Channel, not even an explicit nil
### GetPermalink

`func (o *NoticeEventAnyOf) GetPermalink() string`

GetPermalink returns the Permalink field if non-nil, zero value otherwise.

### GetPermalinkOk

`func (o *NoticeEventAnyOf) GetPermalinkOk() (*string, bool)`

GetPermalinkOk returns a tuple with the Permalink field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPermalink

`func (o *NoticeEventAnyOf) SetPermalink(v string)`

SetPermalink sets Permalink field to given value.


### SetPermalinkNil

`func (o *NoticeEventAnyOf) SetPermalinkNil(b bool)`

 SetPermalinkNil sets the value for Permalink to be an explicit nil

### UnsetPermalink
`func (o *NoticeEventAnyOf) UnsetPermalink()`

UnsetPermalink ensures that no value is present for Permalink, not even an explicit nil
### GetPostId

`func (o *NoticeEventAnyOf) GetPostId() string`

GetPostId returns the PostId field if non-nil, zero value otherwise.

### GetPostIdOk

`func (o *NoticeEventAnyOf) GetPostIdOk() (*string, bool)`

GetPostIdOk returns a tuple with the PostId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPostId

`func (o *NoticeEventAnyOf) SetPostId(v string)`

SetPostId sets PostId field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


