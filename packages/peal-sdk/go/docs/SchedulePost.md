# SchedulePost

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**At** | **string** |  | 
**ChannelIds** | **[]string** |  | 
**TimeZone** | **string** |  | 

## Methods

### NewSchedulePost

`func NewSchedulePost(at string, channelIds []string, timeZone string, ) *SchedulePost`

NewSchedulePost instantiates a new SchedulePost object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewSchedulePostWithDefaults

`func NewSchedulePostWithDefaults() *SchedulePost`

NewSchedulePostWithDefaults instantiates a new SchedulePost object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetAt

`func (o *SchedulePost) GetAt() string`

GetAt returns the At field if non-nil, zero value otherwise.

### GetAtOk

`func (o *SchedulePost) GetAtOk() (*string, bool)`

GetAtOk returns a tuple with the At field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAt

`func (o *SchedulePost) SetAt(v string)`

SetAt sets At field to given value.


### GetChannelIds

`func (o *SchedulePost) GetChannelIds() []string`

GetChannelIds returns the ChannelIds field if non-nil, zero value otherwise.

### GetChannelIdsOk

`func (o *SchedulePost) GetChannelIdsOk() (*[]string, bool)`

GetChannelIdsOk returns a tuple with the ChannelIds field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetChannelIds

`func (o *SchedulePost) SetChannelIds(v []string)`

SetChannelIds sets ChannelIds field to given value.


### GetTimeZone

`func (o *SchedulePost) GetTimeZone() string`

GetTimeZone returns the TimeZone field if non-nil, zero value otherwise.

### GetTimeZoneOk

`func (o *SchedulePost) GetTimeZoneOk() (*string, bool)`

GetTimeZoneOk returns a tuple with the TimeZone field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTimeZone

`func (o *SchedulePost) SetTimeZone(v string)`

SetTimeZone sets TimeZone field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


