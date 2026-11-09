# Usage

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**AssistantRequests** | [**PeriodUsage**](PeriodUsage.md) |  | 
**Channels** | **int32** |  | 
**Members** | **int32** |  | 
**ScheduledPosts** | [**PeriodUsage**](PeriodUsage.md) |  | 

## Methods

### NewUsage

`func NewUsage(assistantRequests PeriodUsage, channels int32, members int32, scheduledPosts PeriodUsage, ) *Usage`

NewUsage instantiates a new Usage object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewUsageWithDefaults

`func NewUsageWithDefaults() *Usage`

NewUsageWithDefaults instantiates a new Usage object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetAssistantRequests

`func (o *Usage) GetAssistantRequests() PeriodUsage`

GetAssistantRequests returns the AssistantRequests field if non-nil, zero value otherwise.

### GetAssistantRequestsOk

`func (o *Usage) GetAssistantRequestsOk() (*PeriodUsage, bool)`

GetAssistantRequestsOk returns a tuple with the AssistantRequests field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAssistantRequests

`func (o *Usage) SetAssistantRequests(v PeriodUsage)`

SetAssistantRequests sets AssistantRequests field to given value.


### GetChannels

`func (o *Usage) GetChannels() int32`

GetChannels returns the Channels field if non-nil, zero value otherwise.

### GetChannelsOk

`func (o *Usage) GetChannelsOk() (*int32, bool)`

GetChannelsOk returns a tuple with the Channels field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetChannels

`func (o *Usage) SetChannels(v int32)`

SetChannels sets Channels field to given value.


### GetMembers

`func (o *Usage) GetMembers() int32`

GetMembers returns the Members field if non-nil, zero value otherwise.

### GetMembersOk

`func (o *Usage) GetMembersOk() (*int32, bool)`

GetMembersOk returns a tuple with the Members field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMembers

`func (o *Usage) SetMembers(v int32)`

SetMembers sets Members field to given value.


### GetScheduledPosts

`func (o *Usage) GetScheduledPosts() PeriodUsage`

GetScheduledPosts returns the ScheduledPosts field if non-nil, zero value otherwise.

### GetScheduledPostsOk

`func (o *Usage) GetScheduledPostsOk() (*PeriodUsage, bool)`

GetScheduledPostsOk returns a tuple with the ScheduledPosts field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetScheduledPosts

`func (o *Usage) SetScheduledPosts(v PeriodUsage)`

SetScheduledPosts sets ScheduledPosts field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


