# MetricsSnapshot

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**CollectedAt** | **string** |  | 
**Metrics** | [**PostMetrics**](PostMetrics.md) |  | 

## Methods

### NewMetricsSnapshot

`func NewMetricsSnapshot(collectedAt string, metrics PostMetrics, ) *MetricsSnapshot`

NewMetricsSnapshot instantiates a new MetricsSnapshot object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewMetricsSnapshotWithDefaults

`func NewMetricsSnapshotWithDefaults() *MetricsSnapshot`

NewMetricsSnapshotWithDefaults instantiates a new MetricsSnapshot object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetCollectedAt

`func (o *MetricsSnapshot) GetCollectedAt() string`

GetCollectedAt returns the CollectedAt field if non-nil, zero value otherwise.

### GetCollectedAtOk

`func (o *MetricsSnapshot) GetCollectedAtOk() (*string, bool)`

GetCollectedAtOk returns a tuple with the CollectedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCollectedAt

`func (o *MetricsSnapshot) SetCollectedAt(v string)`

SetCollectedAt sets CollectedAt field to given value.


### GetMetrics

`func (o *MetricsSnapshot) GetMetrics() PostMetrics`

GetMetrics returns the Metrics field if non-nil, zero value otherwise.

### GetMetricsOk

`func (o *MetricsSnapshot) GetMetricsOk() (*PostMetrics, bool)`

GetMetricsOk returns a tuple with the Metrics field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMetrics

`func (o *MetricsSnapshot) SetMetrics(v PostMetrics)`

SetMetrics sets Metrics field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


