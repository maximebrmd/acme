# NoticeEventAnyOf9

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Tag** | **string** |  | 
**Plan** | [**PaidPlan**](PaidPlan.md) |  | 
**Refunded** | [**Money**](Money.md) |  | 
**WithdrawnAt** | **string** |  | 

## Methods

### NewNoticeEventAnyOf9

`func NewNoticeEventAnyOf9(tag string, plan PaidPlan, refunded Money, withdrawnAt string, ) *NoticeEventAnyOf9`

NewNoticeEventAnyOf9 instantiates a new NoticeEventAnyOf9 object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewNoticeEventAnyOf9WithDefaults

`func NewNoticeEventAnyOf9WithDefaults() *NoticeEventAnyOf9`

NewNoticeEventAnyOf9WithDefaults instantiates a new NoticeEventAnyOf9 object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTag

`func (o *NoticeEventAnyOf9) GetTag() string`

GetTag returns the Tag field if non-nil, zero value otherwise.

### GetTagOk

`func (o *NoticeEventAnyOf9) GetTagOk() (*string, bool)`

GetTagOk returns a tuple with the Tag field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTag

`func (o *NoticeEventAnyOf9) SetTag(v string)`

SetTag sets Tag field to given value.


### GetPlan

`func (o *NoticeEventAnyOf9) GetPlan() PaidPlan`

GetPlan returns the Plan field if non-nil, zero value otherwise.

### GetPlanOk

`func (o *NoticeEventAnyOf9) GetPlanOk() (*PaidPlan, bool)`

GetPlanOk returns a tuple with the Plan field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPlan

`func (o *NoticeEventAnyOf9) SetPlan(v PaidPlan)`

SetPlan sets Plan field to given value.


### GetRefunded

`func (o *NoticeEventAnyOf9) GetRefunded() Money`

GetRefunded returns the Refunded field if non-nil, zero value otherwise.

### GetRefundedOk

`func (o *NoticeEventAnyOf9) GetRefundedOk() (*Money, bool)`

GetRefundedOk returns a tuple with the Refunded field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRefunded

`func (o *NoticeEventAnyOf9) SetRefunded(v Money)`

SetRefunded sets Refunded field to given value.


### GetWithdrawnAt

`func (o *NoticeEventAnyOf9) GetWithdrawnAt() string`

GetWithdrawnAt returns the WithdrawnAt field if non-nil, zero value otherwise.

### GetWithdrawnAtOk

`func (o *NoticeEventAnyOf9) GetWithdrawnAtOk() (*string, bool)`

GetWithdrawnAtOk returns a tuple with the WithdrawnAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetWithdrawnAt

`func (o *NoticeEventAnyOf9) SetWithdrawnAt(v string)`

SetWithdrawnAt sets WithdrawnAt field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


