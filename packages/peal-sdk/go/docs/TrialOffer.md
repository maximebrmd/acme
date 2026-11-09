# TrialOffer

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Available** | **bool** |  | 
**Days** | **int32** |  | 
**Plan** | [**PaidPlan**](PaidPlan.md) |  | 

## Methods

### NewTrialOffer

`func NewTrialOffer(available bool, days int32, plan PaidPlan, ) *TrialOffer`

NewTrialOffer instantiates a new TrialOffer object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewTrialOfferWithDefaults

`func NewTrialOfferWithDefaults() *TrialOffer`

NewTrialOfferWithDefaults instantiates a new TrialOffer object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetAvailable

`func (o *TrialOffer) GetAvailable() bool`

GetAvailable returns the Available field if non-nil, zero value otherwise.

### GetAvailableOk

`func (o *TrialOffer) GetAvailableOk() (*bool, bool)`

GetAvailableOk returns a tuple with the Available field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAvailable

`func (o *TrialOffer) SetAvailable(v bool)`

SetAvailable sets Available field to given value.


### GetDays

`func (o *TrialOffer) GetDays() int32`

GetDays returns the Days field if non-nil, zero value otherwise.

### GetDaysOk

`func (o *TrialOffer) GetDaysOk() (*int32, bool)`

GetDaysOk returns a tuple with the Days field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDays

`func (o *TrialOffer) SetDays(v int32)`

SetDays sets Days field to given value.


### GetPlan

`func (o *TrialOffer) GetPlan() PaidPlan`

GetPlan returns the Plan field if non-nil, zero value otherwise.

### GetPlanOk

`func (o *TrialOffer) GetPlanOk() (*PaidPlan, bool)`

GetPlanOk returns a tuple with the Plan field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPlan

`func (o *TrialOffer) SetPlan(v PaidPlan)`

SetPlan sets Plan field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


