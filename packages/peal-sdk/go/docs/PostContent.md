# PostContent

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Media** | [**[]MediaAttachment**](MediaAttachment.md) |  | 
**Overrides** | [**[]TextOverride**](TextOverride.md) |  | 
**Text** | **string** |  | 

## Methods

### NewPostContent

`func NewPostContent(media []MediaAttachment, overrides []TextOverride, text string, ) *PostContent`

NewPostContent instantiates a new PostContent object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewPostContentWithDefaults

`func NewPostContentWithDefaults() *PostContent`

NewPostContentWithDefaults instantiates a new PostContent object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetMedia

`func (o *PostContent) GetMedia() []MediaAttachment`

GetMedia returns the Media field if non-nil, zero value otherwise.

### GetMediaOk

`func (o *PostContent) GetMediaOk() (*[]MediaAttachment, bool)`

GetMediaOk returns a tuple with the Media field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMedia

`func (o *PostContent) SetMedia(v []MediaAttachment)`

SetMedia sets Media field to given value.


### GetOverrides

`func (o *PostContent) GetOverrides() []TextOverride`

GetOverrides returns the Overrides field if non-nil, zero value otherwise.

### GetOverridesOk

`func (o *PostContent) GetOverridesOk() (*[]TextOverride, bool)`

GetOverridesOk returns a tuple with the Overrides field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetOverrides

`func (o *PostContent) SetOverrides(v []TextOverride)`

SetOverrides sets Overrides field to given value.


### GetText

`func (o *PostContent) GetText() string`

GetText returns the Text field if non-nil, zero value otherwise.

### GetTextOk

`func (o *PostContent) GetTextOk() (*string, bool)`

GetTextOk returns a tuple with the Text field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetText

`func (o *PostContent) SetText(v string)`

SetText sets Text field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


