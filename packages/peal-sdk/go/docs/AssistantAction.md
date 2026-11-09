# AssistantAction

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Tag** | **string** |  | 
**Tone** | [**AssistantTone**](AssistantTone.md) |  | 
**Platform** | [**Platform**](Platform.md) |  | 
**Language** | [**TranslationLanguage**](TranslationLanguage.md) |  | 

## Methods

### NewAssistantAction

`func NewAssistantAction(tag string, tone AssistantTone, platform Platform, language TranslationLanguage, ) *AssistantAction`

NewAssistantAction instantiates a new AssistantAction object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewAssistantActionWithDefaults

`func NewAssistantActionWithDefaults() *AssistantAction`

NewAssistantActionWithDefaults instantiates a new AssistantAction object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTag

`func (o *AssistantAction) GetTag() string`

GetTag returns the Tag field if non-nil, zero value otherwise.

### GetTagOk

`func (o *AssistantAction) GetTagOk() (*string, bool)`

GetTagOk returns a tuple with the Tag field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTag

`func (o *AssistantAction) SetTag(v string)`

SetTag sets Tag field to given value.


### GetTone

`func (o *AssistantAction) GetTone() AssistantTone`

GetTone returns the Tone field if non-nil, zero value otherwise.

### GetToneOk

`func (o *AssistantAction) GetToneOk() (*AssistantTone, bool)`

GetToneOk returns a tuple with the Tone field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTone

`func (o *AssistantAction) SetTone(v AssistantTone)`

SetTone sets Tone field to given value.


### GetPlatform

`func (o *AssistantAction) GetPlatform() Platform`

GetPlatform returns the Platform field if non-nil, zero value otherwise.

### GetPlatformOk

`func (o *AssistantAction) GetPlatformOk() (*Platform, bool)`

GetPlatformOk returns a tuple with the Platform field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPlatform

`func (o *AssistantAction) SetPlatform(v Platform)`

SetPlatform sets Platform field to given value.


### GetLanguage

`func (o *AssistantAction) GetLanguage() TranslationLanguage`

GetLanguage returns the Language field if non-nil, zero value otherwise.

### GetLanguageOk

`func (o *AssistantAction) GetLanguageOk() (*TranslationLanguage, bool)`

GetLanguageOk returns a tuple with the Language field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLanguage

`func (o *AssistantAction) SetLanguage(v TranslationLanguage)`

SetLanguage sets Language field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


