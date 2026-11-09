# PlanOffer

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Allowances** | [**PlanAllowances**](PlanAllowances.md) |  | 
**Plan** | [**Plan**](Plan.md) |  | 

## Methods

### NewPlanOffer

`func NewPlanOffer(allowances PlanAllowances, plan Plan, ) *PlanOffer`

NewPlanOffer instantiates a new PlanOffer object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewPlanOfferWithDefaults

`func NewPlanOfferWithDefaults() *PlanOffer`

NewPlanOfferWithDefaults instantiates a new PlanOffer object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetAllowances

`func (o *PlanOffer) GetAllowances() PlanAllowances`

GetAllowances returns the Allowances field if non-nil, zero value otherwise.

### GetAllowancesOk

`func (o *PlanOffer) GetAllowancesOk() (*PlanAllowances, bool)`

GetAllowancesOk returns a tuple with the Allowances field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAllowances

`func (o *PlanOffer) SetAllowances(v PlanAllowances)`

SetAllowances sets Allowances field to given value.


### GetPlan

`func (o *PlanOffer) GetPlan() Plan`

GetPlan returns the Plan field if non-nil, zero value otherwise.

### GetPlanOk

`func (o *PlanOffer) GetPlanOk() (*Plan, bool)`

GetPlanOk returns a tuple with the Plan field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPlan

`func (o *PlanOffer) SetPlan(v Plan)`

SetPlan sets Plan field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


