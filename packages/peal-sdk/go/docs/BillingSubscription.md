# BillingSubscription

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**CancelAtPeriodEnd** | **bool** |  | 
**CurrentPeriodEnd** | **NullableString** |  | 
**Interval** | [**BillingInterval**](BillingInterval.md) |  | 
**Plan** | [**PaidPlan**](PaidPlan.md) |  | 
**StartedAt** | **NullableString** |  | 
**Status** | [**SubscriptionStatus**](SubscriptionStatus.md) |  | 
**TrialEnd** | **NullableString** |  | 

## Methods

### NewBillingSubscription

`func NewBillingSubscription(cancelAtPeriodEnd bool, currentPeriodEnd NullableString, interval BillingInterval, plan PaidPlan, startedAt NullableString, status SubscriptionStatus, trialEnd NullableString, ) *BillingSubscription`

NewBillingSubscription instantiates a new BillingSubscription object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewBillingSubscriptionWithDefaults

`func NewBillingSubscriptionWithDefaults() *BillingSubscription`

NewBillingSubscriptionWithDefaults instantiates a new BillingSubscription object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetCancelAtPeriodEnd

`func (o *BillingSubscription) GetCancelAtPeriodEnd() bool`

GetCancelAtPeriodEnd returns the CancelAtPeriodEnd field if non-nil, zero value otherwise.

### GetCancelAtPeriodEndOk

`func (o *BillingSubscription) GetCancelAtPeriodEndOk() (*bool, bool)`

GetCancelAtPeriodEndOk returns a tuple with the CancelAtPeriodEnd field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCancelAtPeriodEnd

`func (o *BillingSubscription) SetCancelAtPeriodEnd(v bool)`

SetCancelAtPeriodEnd sets CancelAtPeriodEnd field to given value.


### GetCurrentPeriodEnd

`func (o *BillingSubscription) GetCurrentPeriodEnd() string`

GetCurrentPeriodEnd returns the CurrentPeriodEnd field if non-nil, zero value otherwise.

### GetCurrentPeriodEndOk

`func (o *BillingSubscription) GetCurrentPeriodEndOk() (*string, bool)`

GetCurrentPeriodEndOk returns a tuple with the CurrentPeriodEnd field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCurrentPeriodEnd

`func (o *BillingSubscription) SetCurrentPeriodEnd(v string)`

SetCurrentPeriodEnd sets CurrentPeriodEnd field to given value.


### SetCurrentPeriodEndNil

`func (o *BillingSubscription) SetCurrentPeriodEndNil(b bool)`

 SetCurrentPeriodEndNil sets the value for CurrentPeriodEnd to be an explicit nil

### UnsetCurrentPeriodEnd
`func (o *BillingSubscription) UnsetCurrentPeriodEnd()`

UnsetCurrentPeriodEnd ensures that no value is present for CurrentPeriodEnd, not even an explicit nil
### GetInterval

`func (o *BillingSubscription) GetInterval() BillingInterval`

GetInterval returns the Interval field if non-nil, zero value otherwise.

### GetIntervalOk

`func (o *BillingSubscription) GetIntervalOk() (*BillingInterval, bool)`

GetIntervalOk returns a tuple with the Interval field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetInterval

`func (o *BillingSubscription) SetInterval(v BillingInterval)`

SetInterval sets Interval field to given value.


### GetPlan

`func (o *BillingSubscription) GetPlan() PaidPlan`

GetPlan returns the Plan field if non-nil, zero value otherwise.

### GetPlanOk

`func (o *BillingSubscription) GetPlanOk() (*PaidPlan, bool)`

GetPlanOk returns a tuple with the Plan field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPlan

`func (o *BillingSubscription) SetPlan(v PaidPlan)`

SetPlan sets Plan field to given value.


### GetStartedAt

`func (o *BillingSubscription) GetStartedAt() string`

GetStartedAt returns the StartedAt field if non-nil, zero value otherwise.

### GetStartedAtOk

`func (o *BillingSubscription) GetStartedAtOk() (*string, bool)`

GetStartedAtOk returns a tuple with the StartedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStartedAt

`func (o *BillingSubscription) SetStartedAt(v string)`

SetStartedAt sets StartedAt field to given value.


### SetStartedAtNil

`func (o *BillingSubscription) SetStartedAtNil(b bool)`

 SetStartedAtNil sets the value for StartedAt to be an explicit nil

### UnsetStartedAt
`func (o *BillingSubscription) UnsetStartedAt()`

UnsetStartedAt ensures that no value is present for StartedAt, not even an explicit nil
### GetStatus

`func (o *BillingSubscription) GetStatus() SubscriptionStatus`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *BillingSubscription) GetStatusOk() (*SubscriptionStatus, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *BillingSubscription) SetStatus(v SubscriptionStatus)`

SetStatus sets Status field to given value.


### GetTrialEnd

`func (o *BillingSubscription) GetTrialEnd() string`

GetTrialEnd returns the TrialEnd field if non-nil, zero value otherwise.

### GetTrialEndOk

`func (o *BillingSubscription) GetTrialEndOk() (*string, bool)`

GetTrialEndOk returns a tuple with the TrialEnd field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTrialEnd

`func (o *BillingSubscription) SetTrialEnd(v string)`

SetTrialEnd sets TrialEnd field to given value.


### SetTrialEndNil

`func (o *BillingSubscription) SetTrialEndNil(b bool)`

 SetTrialEndNil sets the value for TrialEnd to be an explicit nil

### UnsetTrialEnd
`func (o *BillingSubscription) UnsetTrialEnd()`

UnsetTrialEnd ensures that no value is present for TrialEnd, not even an explicit nil

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


