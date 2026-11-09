# SuggestionRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Action** | [**AssistantAction**](AssistantAction.md) |  | 
**Text** | **string** |  | 

## Methods

### NewSuggestionRequest

`func NewSuggestionRequest(action AssistantAction, text string, ) *SuggestionRequest`

NewSuggestionRequest instantiates a new SuggestionRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewSuggestionRequestWithDefaults

`func NewSuggestionRequestWithDefaults() *SuggestionRequest`

NewSuggestionRequestWithDefaults instantiates a new SuggestionRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetAction

`func (o *SuggestionRequest) GetAction() AssistantAction`

GetAction returns the Action field if non-nil, zero value otherwise.

### GetActionOk

`func (o *SuggestionRequest) GetActionOk() (*AssistantAction, bool)`

GetActionOk returns a tuple with the Action field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAction

`func (o *SuggestionRequest) SetAction(v AssistantAction)`

SetAction sets Action field to given value.


### GetText

`func (o *SuggestionRequest) GetText() string`

GetText returns the Text field if non-nil, zero value otherwise.

### GetTextOk

`func (o *SuggestionRequest) GetTextOk() (*string, bool)`

GetTextOk returns a tuple with the Text field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetText

`func (o *SuggestionRequest) SetText(v string)`

SetText sets Text field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


