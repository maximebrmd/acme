# TopPost

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**ChannelId** | **string** |  | 
**Engagement** | **int32** |  | 
**Metrics** | [**PostMetrics**](PostMetrics.md) |  | 
**Permalink** | **NullableString** |  | 
**PostId** | **string** |  | 
**PublishedAt** | **string** |  | 
**TargetId** | **string** |  | 

## Methods

### NewTopPost

`func NewTopPost(channelId string, engagement int32, metrics PostMetrics, permalink NullableString, postId string, publishedAt string, targetId string, ) *TopPost`

NewTopPost instantiates a new TopPost object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewTopPostWithDefaults

`func NewTopPostWithDefaults() *TopPost`

NewTopPostWithDefaults instantiates a new TopPost object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetChannelId

`func (o *TopPost) GetChannelId() string`

GetChannelId returns the ChannelId field if non-nil, zero value otherwise.

### GetChannelIdOk

`func (o *TopPost) GetChannelIdOk() (*string, bool)`

GetChannelIdOk returns a tuple with the ChannelId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetChannelId

`func (o *TopPost) SetChannelId(v string)`

SetChannelId sets ChannelId field to given value.


### GetEngagement

`func (o *TopPost) GetEngagement() int32`

GetEngagement returns the Engagement field if non-nil, zero value otherwise.

### GetEngagementOk

`func (o *TopPost) GetEngagementOk() (*int32, bool)`

GetEngagementOk returns a tuple with the Engagement field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEngagement

`func (o *TopPost) SetEngagement(v int32)`

SetEngagement sets Engagement field to given value.


### GetMetrics

`func (o *TopPost) GetMetrics() PostMetrics`

GetMetrics returns the Metrics field if non-nil, zero value otherwise.

### GetMetricsOk

`func (o *TopPost) GetMetricsOk() (*PostMetrics, bool)`

GetMetricsOk returns a tuple with the Metrics field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMetrics

`func (o *TopPost) SetMetrics(v PostMetrics)`

SetMetrics sets Metrics field to given value.


### GetPermalink

`func (o *TopPost) GetPermalink() string`

GetPermalink returns the Permalink field if non-nil, zero value otherwise.

### GetPermalinkOk

`func (o *TopPost) GetPermalinkOk() (*string, bool)`

GetPermalinkOk returns a tuple with the Permalink field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPermalink

`func (o *TopPost) SetPermalink(v string)`

SetPermalink sets Permalink field to given value.


### SetPermalinkNil

`func (o *TopPost) SetPermalinkNil(b bool)`

 SetPermalinkNil sets the value for Permalink to be an explicit nil

### UnsetPermalink
`func (o *TopPost) UnsetPermalink()`

UnsetPermalink ensures that no value is present for Permalink, not even an explicit nil
### GetPostId

`func (o *TopPost) GetPostId() string`

GetPostId returns the PostId field if non-nil, zero value otherwise.

### GetPostIdOk

`func (o *TopPost) GetPostIdOk() (*string, bool)`

GetPostIdOk returns a tuple with the PostId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPostId

`func (o *TopPost) SetPostId(v string)`

SetPostId sets PostId field to given value.


### GetPublishedAt

`func (o *TopPost) GetPublishedAt() string`

GetPublishedAt returns the PublishedAt field if non-nil, zero value otherwise.

### GetPublishedAtOk

`func (o *TopPost) GetPublishedAtOk() (*string, bool)`

GetPublishedAtOk returns a tuple with the PublishedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPublishedAt

`func (o *TopPost) SetPublishedAt(v string)`

SetPublishedAt sets PublishedAt field to given value.


### GetTargetId

`func (o *TopPost) GetTargetId() string`

GetTargetId returns the TargetId field if non-nil, zero value otherwise.

### GetTargetIdOk

`func (o *TopPost) GetTargetIdOk() (*string, bool)`

GetTargetIdOk returns a tuple with the TargetId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTargetId

`func (o *TopPost) SetTargetId(v string)`

SetTargetId sets TargetId field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


