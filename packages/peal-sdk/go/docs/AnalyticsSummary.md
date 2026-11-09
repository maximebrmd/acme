# AnalyticsSummary

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Channels** | [**[]ChannelMetrics**](ChannelMetrics.md) |  | 
**Days** | [**[]EngagementDay**](EngagementDay.md) |  | 
**From** | **string** |  | 
**TimeZone** | **string** |  | 
**To** | **string** |  | 
**TopPosts** | [**[]TopPost**](TopPost.md) |  | 
**Totals** | [**MetricTotals**](MetricTotals.md) |  | 

## Methods

### NewAnalyticsSummary

`func NewAnalyticsSummary(channels []ChannelMetrics, days []EngagementDay, from string, timeZone string, to string, topPosts []TopPost, totals MetricTotals, ) *AnalyticsSummary`

NewAnalyticsSummary instantiates a new AnalyticsSummary object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewAnalyticsSummaryWithDefaults

`func NewAnalyticsSummaryWithDefaults() *AnalyticsSummary`

NewAnalyticsSummaryWithDefaults instantiates a new AnalyticsSummary object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetChannels

`func (o *AnalyticsSummary) GetChannels() []ChannelMetrics`

GetChannels returns the Channels field if non-nil, zero value otherwise.

### GetChannelsOk

`func (o *AnalyticsSummary) GetChannelsOk() (*[]ChannelMetrics, bool)`

GetChannelsOk returns a tuple with the Channels field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetChannels

`func (o *AnalyticsSummary) SetChannels(v []ChannelMetrics)`

SetChannels sets Channels field to given value.


### GetDays

`func (o *AnalyticsSummary) GetDays() []EngagementDay`

GetDays returns the Days field if non-nil, zero value otherwise.

### GetDaysOk

`func (o *AnalyticsSummary) GetDaysOk() (*[]EngagementDay, bool)`

GetDaysOk returns a tuple with the Days field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDays

`func (o *AnalyticsSummary) SetDays(v []EngagementDay)`

SetDays sets Days field to given value.


### GetFrom

`func (o *AnalyticsSummary) GetFrom() string`

GetFrom returns the From field if non-nil, zero value otherwise.

### GetFromOk

`func (o *AnalyticsSummary) GetFromOk() (*string, bool)`

GetFromOk returns a tuple with the From field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFrom

`func (o *AnalyticsSummary) SetFrom(v string)`

SetFrom sets From field to given value.


### GetTimeZone

`func (o *AnalyticsSummary) GetTimeZone() string`

GetTimeZone returns the TimeZone field if non-nil, zero value otherwise.

### GetTimeZoneOk

`func (o *AnalyticsSummary) GetTimeZoneOk() (*string, bool)`

GetTimeZoneOk returns a tuple with the TimeZone field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTimeZone

`func (o *AnalyticsSummary) SetTimeZone(v string)`

SetTimeZone sets TimeZone field to given value.


### GetTo

`func (o *AnalyticsSummary) GetTo() string`

GetTo returns the To field if non-nil, zero value otherwise.

### GetToOk

`func (o *AnalyticsSummary) GetToOk() (*string, bool)`

GetToOk returns a tuple with the To field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTo

`func (o *AnalyticsSummary) SetTo(v string)`

SetTo sets To field to given value.


### GetTopPosts

`func (o *AnalyticsSummary) GetTopPosts() []TopPost`

GetTopPosts returns the TopPosts field if non-nil, zero value otherwise.

### GetTopPostsOk

`func (o *AnalyticsSummary) GetTopPostsOk() (*[]TopPost, bool)`

GetTopPostsOk returns a tuple with the TopPosts field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTopPosts

`func (o *AnalyticsSummary) SetTopPosts(v []TopPost)`

SetTopPosts sets TopPosts field to given value.


### GetTotals

`func (o *AnalyticsSummary) GetTotals() MetricTotals`

GetTotals returns the Totals field if non-nil, zero value otherwise.

### GetTotalsOk

`func (o *AnalyticsSummary) GetTotalsOk() (*MetricTotals, bool)`

GetTotalsOk returns a tuple with the Totals field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTotals

`func (o *AnalyticsSummary) SetTotals(v MetricTotals)`

SetTotals sets Totals field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


