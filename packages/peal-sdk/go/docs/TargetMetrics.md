# TargetMetrics

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**ChannelId** | **string** |  | 
**Collecting** | **bool** |  | 
**LastCollectedAt** | **NullableString** |  | 
**Latest** | [**NullablePostMetrics**](PostMetrics.md) |  | 
**Permalink** | **NullableString** |  | 
**PublishedAt** | **string** |  | 
**Snapshots** | [**[]MetricsSnapshot**](MetricsSnapshot.md) |  | 
**TargetId** | **string** |  | 

## Methods

### NewTargetMetrics

`func NewTargetMetrics(channelId string, collecting bool, lastCollectedAt NullableString, latest NullablePostMetrics, permalink NullableString, publishedAt string, snapshots []MetricsSnapshot, targetId string, ) *TargetMetrics`

NewTargetMetrics instantiates a new TargetMetrics object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewTargetMetricsWithDefaults

`func NewTargetMetricsWithDefaults() *TargetMetrics`

NewTargetMetricsWithDefaults instantiates a new TargetMetrics object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetChannelId

`func (o *TargetMetrics) GetChannelId() string`

GetChannelId returns the ChannelId field if non-nil, zero value otherwise.

### GetChannelIdOk

`func (o *TargetMetrics) GetChannelIdOk() (*string, bool)`

GetChannelIdOk returns a tuple with the ChannelId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetChannelId

`func (o *TargetMetrics) SetChannelId(v string)`

SetChannelId sets ChannelId field to given value.


### GetCollecting

`func (o *TargetMetrics) GetCollecting() bool`

GetCollecting returns the Collecting field if non-nil, zero value otherwise.

### GetCollectingOk

`func (o *TargetMetrics) GetCollectingOk() (*bool, bool)`

GetCollectingOk returns a tuple with the Collecting field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCollecting

`func (o *TargetMetrics) SetCollecting(v bool)`

SetCollecting sets Collecting field to given value.


### GetLastCollectedAt

`func (o *TargetMetrics) GetLastCollectedAt() string`

GetLastCollectedAt returns the LastCollectedAt field if non-nil, zero value otherwise.

### GetLastCollectedAtOk

`func (o *TargetMetrics) GetLastCollectedAtOk() (*string, bool)`

GetLastCollectedAtOk returns a tuple with the LastCollectedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLastCollectedAt

`func (o *TargetMetrics) SetLastCollectedAt(v string)`

SetLastCollectedAt sets LastCollectedAt field to given value.


### SetLastCollectedAtNil

`func (o *TargetMetrics) SetLastCollectedAtNil(b bool)`

 SetLastCollectedAtNil sets the value for LastCollectedAt to be an explicit nil

### UnsetLastCollectedAt
`func (o *TargetMetrics) UnsetLastCollectedAt()`

UnsetLastCollectedAt ensures that no value is present for LastCollectedAt, not even an explicit nil
### GetLatest

`func (o *TargetMetrics) GetLatest() PostMetrics`

GetLatest returns the Latest field if non-nil, zero value otherwise.

### GetLatestOk

`func (o *TargetMetrics) GetLatestOk() (*PostMetrics, bool)`

GetLatestOk returns a tuple with the Latest field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLatest

`func (o *TargetMetrics) SetLatest(v PostMetrics)`

SetLatest sets Latest field to given value.


### SetLatestNil

`func (o *TargetMetrics) SetLatestNil(b bool)`

 SetLatestNil sets the value for Latest to be an explicit nil

### UnsetLatest
`func (o *TargetMetrics) UnsetLatest()`

UnsetLatest ensures that no value is present for Latest, not even an explicit nil
### GetPermalink

`func (o *TargetMetrics) GetPermalink() string`

GetPermalink returns the Permalink field if non-nil, zero value otherwise.

### GetPermalinkOk

`func (o *TargetMetrics) GetPermalinkOk() (*string, bool)`

GetPermalinkOk returns a tuple with the Permalink field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPermalink

`func (o *TargetMetrics) SetPermalink(v string)`

SetPermalink sets Permalink field to given value.


### SetPermalinkNil

`func (o *TargetMetrics) SetPermalinkNil(b bool)`

 SetPermalinkNil sets the value for Permalink to be an explicit nil

### UnsetPermalink
`func (o *TargetMetrics) UnsetPermalink()`

UnsetPermalink ensures that no value is present for Permalink, not even an explicit nil
### GetPublishedAt

`func (o *TargetMetrics) GetPublishedAt() string`

GetPublishedAt returns the PublishedAt field if non-nil, zero value otherwise.

### GetPublishedAtOk

`func (o *TargetMetrics) GetPublishedAtOk() (*string, bool)`

GetPublishedAtOk returns a tuple with the PublishedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPublishedAt

`func (o *TargetMetrics) SetPublishedAt(v string)`

SetPublishedAt sets PublishedAt field to given value.


### GetSnapshots

`func (o *TargetMetrics) GetSnapshots() []MetricsSnapshot`

GetSnapshots returns the Snapshots field if non-nil, zero value otherwise.

### GetSnapshotsOk

`func (o *TargetMetrics) GetSnapshotsOk() (*[]MetricsSnapshot, bool)`

GetSnapshotsOk returns a tuple with the Snapshots field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSnapshots

`func (o *TargetMetrics) SetSnapshots(v []MetricsSnapshot)`

SetSnapshots sets Snapshots field to given value.


### GetTargetId

`func (o *TargetMetrics) GetTargetId() string`

GetTargetId returns the TargetId field if non-nil, zero value otherwise.

### GetTargetIdOk

`func (o *TargetMetrics) GetTargetIdOk() (*string, bool)`

GetTargetIdOk returns a tuple with the TargetId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTargetId

`func (o *TargetMetrics) SetTargetId(v string)`

SetTargetId sets TargetId field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


