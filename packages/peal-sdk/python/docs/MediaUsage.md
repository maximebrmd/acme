# MediaUsage


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**drafts** | **List[str]** |  | 
**scheduled** | **List[str]** |  | 

## Example

```python
from peal.models.media_usage import MediaUsage

# TODO update the JSON string below
json = "{}"
# create an instance of MediaUsage from a JSON string
media_usage_instance = MediaUsage.from_json(json)
# print the JSON string representation of the object
print(MediaUsage.to_json())

# convert the object into a dict
media_usage_dict = media_usage_instance.to_dict()
# create an instance of MediaUsage from a dict
media_usage_from_dict = MediaUsage.from_dict(media_usage_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


