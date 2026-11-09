# NoticeEventAnyOf5

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Tag** | **string** |  | 
**Interval** | [**BillingInterval**](BillingInterval.md) |  | 
**Plan** | [**PaidPlan**](PaidPlan.md) |  | 
**Price** | [**Money**](Money.md) |  | 
**StartedAt** | **string** |  | 
**TrialEnd** | **NullableString** |  | 

## Methods

### NewNoticeEventAnyOf5

`func NewNoticeEventAnyOf5(tag string, interval BillingInterval, plan PaidPlan, price Money, startedAt string, trialEnd NullableString, ) *NoticeEventAnyOf5`

NewNoticeEventAnyOf5 instantiates a new NoticeEventAnyOf5 object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewNoticeEventAnyOf5WithDefaults

`func NewNoticeEventAnyOf5WithDefaults() *NoticeEventAnyOf5`

NewNoticeEventAnyOf5WithDefaults instantiates a new NoticeEventAnyOf5 object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTag

`func (o *NoticeEventAnyOf5) GetTag() string`

GetTag returns the Tag field if non-nil, zero value otherwise.

### GetTagOk

`func (o *NoticeEventAnyOf5) GetTagOk() (*string, bool)`

GetTagOk returns a tuple with the Tag field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTag

`func (o *NoticeEventAnyOf5) SetTag(v string)`

SetTag sets Tag field to given value.


### GetInterval

`func (o *NoticeEventAnyOf5) GetInterval() BillingInterval`

GetInterval returns the Interval field if non-nil, zero value otherwise.

### GetIntervalOk

`func (o *NoticeEventAnyOf5) GetIntervalOk() (*BillingInterval, bool)`

GetIntervalOk returns a tuple with the Interval field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetInterval

`func (o *NoticeEventAnyOf5) SetInterval(v BillingInterval)`

SetInterval sets Interval field to given value.


### GetPlan

`func (o *NoticeEventAnyOf5) GetPlan() PaidPlan`

GetPlan returns the Plan field if non-nil, zero value otherwise.

### GetPlanOk

`func (o *NoticeEventAnyOf5) GetPlanOk() (*PaidPlan, bool)`

GetPlanOk returns a tuple with the Plan field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPlan

`func (o *NoticeEventAnyOf5) SetPlan(v PaidPlan)`

SetPlan sets Plan field to given value.


### GetPrice

`func (o *NoticeEventAnyOf5) GetPrice() Money`

GetPrice returns the Price field if non-nil, zero value otherwise.

### GetPriceOk

`func (o *NoticeEventAnyOf5) GetPriceOk() (*Money, bool)`

GetPriceOk returns a tuple with the Price field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPrice

`func (o *NoticeEventAnyOf5) SetPrice(v Money)`

SetPrice sets Price field to given value.


### GetStartedAt

`func (o *NoticeEventAnyOf5) GetStartedAt() string`

GetStartedAt returns the StartedAt field if non-nil, zero value otherwise.

### GetStartedAtOk

`func (o *NoticeEventAnyOf5) GetStartedAtOk() (*string, bool)`

GetStartedAtOk returns a tuple with the StartedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStartedAt

`func (o *NoticeEventAnyOf5) SetStartedAt(v string)`

SetStartedAt sets StartedAt field to given value.


### GetTrialEnd

`func (o *NoticeEventAnyOf5) GetTrialEnd() string`

GetTrialEnd returns the TrialEnd field if non-nil, zero value otherwise.

### GetTrialEndOk

`func (o *NoticeEventAnyOf5) GetTrialEndOk() (*string, bool)`

GetTrialEndOk returns a tuple with the TrialEnd field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTrialEnd

`func (o *NoticeEventAnyOf5) SetTrialEnd(v string)`

SetTrialEnd sets TrialEnd field to given value.


### SetTrialEndNil

`func (o *NoticeEventAnyOf5) SetTrialEndNil(b bool)`

 SetTrialEndNil sets the value for TrialEnd to be an explicit nil

### UnsetTrialEnd
`func (o *NoticeEventAnyOf5) UnsetTrialEnd()`

UnsetTrialEnd ensures that no value is present for TrialEnd, not even an explicit nil

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


