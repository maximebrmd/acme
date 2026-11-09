# Billing

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Allowances** | [**PlanAllowances**](PlanAllowances.md) |  | 
**Currency** | **string** |  | 
**Enabled** | **bool** |  | 
**Plan** | [**NullablePlan**](Plan.md) |  | 
**Plans** | [**[]PlanOffer**](PlanOffer.md) |  | 
**Subscription** | [**NullableBillingSubscription**](BillingSubscription.md) |  | 
**Trial** | [**NullableTrialOffer**](TrialOffer.md) |  | 
**Usage** | [**Usage**](Usage.md) |  | 
**VatRate** | **int32** |  | 
**WithdrawableUntil** | **NullableString** |  | 

## Methods

### NewBilling

`func NewBilling(allowances PlanAllowances, currency string, enabled bool, plan NullablePlan, plans []PlanOffer, subscription NullableBillingSubscription, trial NullableTrialOffer, usage Usage, vatRate int32, withdrawableUntil NullableString, ) *Billing`

NewBilling instantiates a new Billing object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewBillingWithDefaults

`func NewBillingWithDefaults() *Billing`

NewBillingWithDefaults instantiates a new Billing object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetAllowances

`func (o *Billing) GetAllowances() PlanAllowances`

GetAllowances returns the Allowances field if non-nil, zero value otherwise.

### GetAllowancesOk

`func (o *Billing) GetAllowancesOk() (*PlanAllowances, bool)`

GetAllowancesOk returns a tuple with the Allowances field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAllowances

`func (o *Billing) SetAllowances(v PlanAllowances)`

SetAllowances sets Allowances field to given value.


### GetCurrency

`func (o *Billing) GetCurrency() string`

GetCurrency returns the Currency field if non-nil, zero value otherwise.

### GetCurrencyOk

`func (o *Billing) GetCurrencyOk() (*string, bool)`

GetCurrencyOk returns a tuple with the Currency field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCurrency

`func (o *Billing) SetCurrency(v string)`

SetCurrency sets Currency field to given value.


### GetEnabled

`func (o *Billing) GetEnabled() bool`

GetEnabled returns the Enabled field if non-nil, zero value otherwise.

### GetEnabledOk

`func (o *Billing) GetEnabledOk() (*bool, bool)`

GetEnabledOk returns a tuple with the Enabled field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEnabled

`func (o *Billing) SetEnabled(v bool)`

SetEnabled sets Enabled field to given value.


### GetPlan

`func (o *Billing) GetPlan() Plan`

GetPlan returns the Plan field if non-nil, zero value otherwise.

### GetPlanOk

`func (o *Billing) GetPlanOk() (*Plan, bool)`

GetPlanOk returns a tuple with the Plan field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPlan

`func (o *Billing) SetPlan(v Plan)`

SetPlan sets Plan field to given value.


### SetPlanNil

`func (o *Billing) SetPlanNil(b bool)`

 SetPlanNil sets the value for Plan to be an explicit nil

### UnsetPlan
`func (o *Billing) UnsetPlan()`

UnsetPlan ensures that no value is present for Plan, not even an explicit nil
### GetPlans

`func (o *Billing) GetPlans() []PlanOffer`

GetPlans returns the Plans field if non-nil, zero value otherwise.

### GetPlansOk

`func (o *Billing) GetPlansOk() (*[]PlanOffer, bool)`

GetPlansOk returns a tuple with the Plans field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPlans

`func (o *Billing) SetPlans(v []PlanOffer)`

SetPlans sets Plans field to given value.


### GetSubscription

`func (o *Billing) GetSubscription() BillingSubscription`

GetSubscription returns the Subscription field if non-nil, zero value otherwise.

### GetSubscriptionOk

`func (o *Billing) GetSubscriptionOk() (*BillingSubscription, bool)`

GetSubscriptionOk returns a tuple with the Subscription field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSubscription

`func (o *Billing) SetSubscription(v BillingSubscription)`

SetSubscription sets Subscription field to given value.


### SetSubscriptionNil

`func (o *Billing) SetSubscriptionNil(b bool)`

 SetSubscriptionNil sets the value for Subscription to be an explicit nil

### UnsetSubscription
`func (o *Billing) UnsetSubscription()`

UnsetSubscription ensures that no value is present for Subscription, not even an explicit nil
### GetTrial

`func (o *Billing) GetTrial() TrialOffer`

GetTrial returns the Trial field if non-nil, zero value otherwise.

### GetTrialOk

`func (o *Billing) GetTrialOk() (*TrialOffer, bool)`

GetTrialOk returns a tuple with the Trial field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTrial

`func (o *Billing) SetTrial(v TrialOffer)`

SetTrial sets Trial field to given value.


### SetTrialNil

`func (o *Billing) SetTrialNil(b bool)`

 SetTrialNil sets the value for Trial to be an explicit nil

### UnsetTrial
`func (o *Billing) UnsetTrial()`

UnsetTrial ensures that no value is present for Trial, not even an explicit nil
### GetUsage

`func (o *Billing) GetUsage() Usage`

GetUsage returns the Usage field if non-nil, zero value otherwise.

### GetUsageOk

`func (o *Billing) GetUsageOk() (*Usage, bool)`

GetUsageOk returns a tuple with the Usage field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetUsage

`func (o *Billing) SetUsage(v Usage)`

SetUsage sets Usage field to given value.


### GetVatRate

`func (o *Billing) GetVatRate() int32`

GetVatRate returns the VatRate field if non-nil, zero value otherwise.

### GetVatRateOk

`func (o *Billing) GetVatRateOk() (*int32, bool)`

GetVatRateOk returns a tuple with the VatRate field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetVatRate

`func (o *Billing) SetVatRate(v int32)`

SetVatRate sets VatRate field to given value.


### GetWithdrawableUntil

`func (o *Billing) GetWithdrawableUntil() string`

GetWithdrawableUntil returns the WithdrawableUntil field if non-nil, zero value otherwise.

### GetWithdrawableUntilOk

`func (o *Billing) GetWithdrawableUntilOk() (*string, bool)`

GetWithdrawableUntilOk returns a tuple with the WithdrawableUntil field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetWithdrawableUntil

`func (o *Billing) SetWithdrawableUntil(v string)`

SetWithdrawableUntil sets WithdrawableUntil field to given value.


### SetWithdrawableUntilNil

`func (o *Billing) SetWithdrawableUntilNil(b bool)`

 SetWithdrawableUntilNil sets the value for WithdrawableUntil to be an explicit nil

### UnsetWithdrawableUntil
`func (o *Billing) UnsetWithdrawableUntil()`

UnsetWithdrawableUntil ensures that no value is present for WithdrawableUntil, not even an explicit nil

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


