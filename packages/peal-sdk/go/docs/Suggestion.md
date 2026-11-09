# Suggestion

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Tag** | **string** |  | 
**Text** | **string** |  | 
**Hashtags** | **[]string** |  | 

## Methods

### NewSuggestion

`func NewSuggestion(tag string, text string, hashtags []string, ) *Suggestion`

NewSuggestion instantiates a new Suggestion object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewSuggestionWithDefaults

`func NewSuggestionWithDefaults() *Suggestion`

NewSuggestionWithDefaults instantiates a new Suggestion object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTag

`func (o *Suggestion) GetTag() string`

GetTag returns the Tag field if non-nil, zero value otherwise.

### GetTagOk

`func (o *Suggestion) GetTagOk() (*string, bool)`

GetTagOk returns a tuple with the Tag field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTag

`func (o *Suggestion) SetTag(v string)`

SetTag sets Tag field to given value.


### GetText

`func (o *Suggestion) GetText() string`

GetText returns the Text field if non-nil, zero value otherwise.

### GetTextOk

`func (o *Suggestion) GetTextOk() (*string, bool)`

GetTextOk returns a tuple with the Text field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetText

`func (o *Suggestion) SetText(v string)`

SetText sets Text field to given value.


### GetHashtags

`func (o *Suggestion) GetHashtags() []string`

GetHashtags returns the Hashtags field if non-nil, zero value otherwise.

### GetHashtagsOk

`func (o *Suggestion) GetHashtagsOk() (*[]string, bool)`

GetHashtagsOk returns a tuple with the Hashtags field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetHashtags

`func (o *Suggestion) SetHashtags(v []string)`

SetHashtags sets Hashtags field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


