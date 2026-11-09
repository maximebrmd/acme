# PostsSchedule422Response

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Tag** | **string** |  | 
**TimeZone** | **string** |  | 
**Violations** | [**[]ContentViolation**](ContentViolation.md) |  | 
**ChannelIds** | **[]string** |  | 
**MediaIds** | **[]string** |  | 

## Methods

### NewPostsSchedule422Response

`func NewPostsSchedule422Response(tag string, timeZone string, violations []ContentViolation, channelIds []string, mediaIds []string, ) *PostsSchedule422Response`

NewPostsSchedule422Response instantiates a new PostsSchedule422Response object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewPostsSchedule422ResponseWithDefaults

`func NewPostsSchedule422ResponseWithDefaults() *PostsSchedule422Response`

NewPostsSchedule422ResponseWithDefaults instantiates a new PostsSchedule422Response object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTag

`func (o *PostsSchedule422Response) GetTag() string`

GetTag returns the Tag field if non-nil, zero value otherwise.

### GetTagOk

`func (o *PostsSchedule422Response) GetTagOk() (*string, bool)`

GetTagOk returns a tuple with the Tag field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTag

`func (o *PostsSchedule422Response) SetTag(v string)`

SetTag sets Tag field to given value.


### GetTimeZone

`func (o *PostsSchedule422Response) GetTimeZone() string`

GetTimeZone returns the TimeZone field if non-nil, zero value otherwise.

### GetTimeZoneOk

`func (o *PostsSchedule422Response) GetTimeZoneOk() (*string, bool)`

GetTimeZoneOk returns a tuple with the TimeZone field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTimeZone

`func (o *PostsSchedule422Response) SetTimeZone(v string)`

SetTimeZone sets TimeZone field to given value.


### GetViolations

`func (o *PostsSchedule422Response) GetViolations() []ContentViolation`

GetViolations returns the Violations field if non-nil, zero value otherwise.

### GetViolationsOk

`func (o *PostsSchedule422Response) GetViolationsOk() (*[]ContentViolation, bool)`

GetViolationsOk returns a tuple with the Violations field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetViolations

`func (o *PostsSchedule422Response) SetViolations(v []ContentViolation)`

SetViolations sets Violations field to given value.


### GetChannelIds

`func (o *PostsSchedule422Response) GetChannelIds() []string`

GetChannelIds returns the ChannelIds field if non-nil, zero value otherwise.

### GetChannelIdsOk

`func (o *PostsSchedule422Response) GetChannelIdsOk() (*[]string, bool)`

GetChannelIdsOk returns a tuple with the ChannelIds field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetChannelIds

`func (o *PostsSchedule422Response) SetChannelIds(v []string)`

SetChannelIds sets ChannelIds field to given value.


### GetMediaIds

`func (o *PostsSchedule422Response) GetMediaIds() []string`

GetMediaIds returns the MediaIds field if non-nil, zero value otherwise.

### GetMediaIdsOk

`func (o *PostsSchedule422Response) GetMediaIdsOk() (*[]string, bool)`

GetMediaIdsOk returns a tuple with the MediaIds field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMediaIds

`func (o *PostsSchedule422Response) SetMediaIds(v []string)`

SetMediaIds sets MediaIds field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


