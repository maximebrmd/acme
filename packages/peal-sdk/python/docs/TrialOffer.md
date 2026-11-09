# TrialOffer


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**available** | **bool** |  | 
**days** | **int** |  | 
**plan** | [**PaidPlan**](PaidPlan.md) |  | 

## Example

```python
from peal.models.trial_offer import TrialOffer

# TODO update the JSON string below
json = "{}"
# create an instance of TrialOffer from a JSON string
trial_offer_instance = TrialOffer.from_json(json)
# print the JSON string representation of the object
print(TrialOffer.to_json())

# convert the object into a dict
trial_offer_dict = trial_offer_instance.to_dict()
# create an instance of TrialOffer from a dict
trial_offer_from_dict = TrialOffer.from_dict(trial_offer_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


