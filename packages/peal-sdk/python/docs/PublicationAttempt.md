# PublicationAttempt


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**attempt** | **int** |  | 
**finished_at** | **str** |  | 
**result** | [**AttemptResult**](AttemptResult.md) |  | 
**retry_at** | **str** |  | 
**round** | **int** |  | 
**started_at** | **str** |  | 
**target_id** | **str** |  | 

## Example

```python
from peal.models.publication_attempt import PublicationAttempt

# TODO update the JSON string below
json = "{}"
# create an instance of PublicationAttempt from a JSON string
publication_attempt_instance = PublicationAttempt.from_json(json)
# print the JSON string representation of the object
print(PublicationAttempt.to_json())

# convert the object into a dict
publication_attempt_dict = publication_attempt_instance.to_dict()
# create an instance of PublicationAttempt from a dict
publication_attempt_from_dict = PublicationAttempt.from_dict(publication_attempt_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


