# PostAnalytics

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**PostId** | **string** |  | 
**Targets** | [**[]TargetMetrics**](TargetMetrics.md) |  | 

## Methods

### NewPostAnalytics

`func NewPostAnalytics(postId string, targets []TargetMetrics, ) *PostAnalytics`

NewPostAnalytics instantiates a new PostAnalytics object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewPostAnalyticsWithDefaults

`func NewPostAnalyticsWithDefaults() *PostAnalytics`

NewPostAnalyticsWithDefaults instantiates a new PostAnalytics object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetPostId

`func (o *PostAnalytics) GetPostId() string`

GetPostId returns the PostId field if non-nil, zero value otherwise.

### GetPostIdOk

`func (o *PostAnalytics) GetPostIdOk() (*string, bool)`

GetPostIdOk returns a tuple with the PostId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPostId

`func (o *PostAnalytics) SetPostId(v string)`

SetPostId sets PostId field to given value.


### GetTargets

`func (o *PostAnalytics) GetTargets() []TargetMetrics`

GetTargets returns the Targets field if non-nil, zero value otherwise.

### GetTargetsOk

`func (o *PostAnalytics) GetTargetsOk() (*[]TargetMetrics, bool)`

GetTargetsOk returns a tuple with the Targets field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTargets

`func (o *PostAnalytics) SetTargets(v []TargetMetrics)`

SetTargets sets Targets field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


