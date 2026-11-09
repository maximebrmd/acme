# TikTokOptions

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**AiGenerated** | Pointer to **bool** |  | [optional] 
**BrandContent** | Pointer to **bool** |  | [optional] 
**BrandOrganic** | Pointer to **bool** |  | [optional] 
**CommercialContent** | Pointer to **bool** |  | [optional] 
**DisableComment** | Pointer to **bool** |  | [optional] 
**DisableDuet** | Pointer to **bool** |  | [optional] 
**DisableStitch** | Pointer to **bool** |  | [optional] 
**Platform** | **string** |  | 
**PrivacyLevel** | Pointer to [**TikTokPrivacyLevel**](TikTokPrivacyLevel.md) |  | [optional] 

## Methods

### NewTikTokOptions

`func NewTikTokOptions(platform string, ) *TikTokOptions`

NewTikTokOptions instantiates a new TikTokOptions object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewTikTokOptionsWithDefaults

`func NewTikTokOptionsWithDefaults() *TikTokOptions`

NewTikTokOptionsWithDefaults instantiates a new TikTokOptions object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetAiGenerated

`func (o *TikTokOptions) GetAiGenerated() bool`

GetAiGenerated returns the AiGenerated field if non-nil, zero value otherwise.

### GetAiGeneratedOk

`func (o *TikTokOptions) GetAiGeneratedOk() (*bool, bool)`

GetAiGeneratedOk returns a tuple with the AiGenerated field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAiGenerated

`func (o *TikTokOptions) SetAiGenerated(v bool)`

SetAiGenerated sets AiGenerated field to given value.

### HasAiGenerated

`func (o *TikTokOptions) HasAiGenerated() bool`

HasAiGenerated returns a boolean if a field has been set.

### GetBrandContent

`func (o *TikTokOptions) GetBrandContent() bool`

GetBrandContent returns the BrandContent field if non-nil, zero value otherwise.

### GetBrandContentOk

`func (o *TikTokOptions) GetBrandContentOk() (*bool, bool)`

GetBrandContentOk returns a tuple with the BrandContent field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetBrandContent

`func (o *TikTokOptions) SetBrandContent(v bool)`

SetBrandContent sets BrandContent field to given value.

### HasBrandContent

`func (o *TikTokOptions) HasBrandContent() bool`

HasBrandContent returns a boolean if a field has been set.

### GetBrandOrganic

`func (o *TikTokOptions) GetBrandOrganic() bool`

GetBrandOrganic returns the BrandOrganic field if non-nil, zero value otherwise.

### GetBrandOrganicOk

`func (o *TikTokOptions) GetBrandOrganicOk() (*bool, bool)`

GetBrandOrganicOk returns a tuple with the BrandOrganic field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetBrandOrganic

`func (o *TikTokOptions) SetBrandOrganic(v bool)`

SetBrandOrganic sets BrandOrganic field to given value.

### HasBrandOrganic

`func (o *TikTokOptions) HasBrandOrganic() bool`

HasBrandOrganic returns a boolean if a field has been set.

### GetCommercialContent

`func (o *TikTokOptions) GetCommercialContent() bool`

GetCommercialContent returns the CommercialContent field if non-nil, zero value otherwise.

### GetCommercialContentOk

`func (o *TikTokOptions) GetCommercialContentOk() (*bool, bool)`

GetCommercialContentOk returns a tuple with the CommercialContent field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCommercialContent

`func (o *TikTokOptions) SetCommercialContent(v bool)`

SetCommercialContent sets CommercialContent field to given value.

### HasCommercialContent

`func (o *TikTokOptions) HasCommercialContent() bool`

HasCommercialContent returns a boolean if a field has been set.

### GetDisableComment

`func (o *TikTokOptions) GetDisableComment() bool`

GetDisableComment returns the DisableComment field if non-nil, zero value otherwise.

### GetDisableCommentOk

`func (o *TikTokOptions) GetDisableCommentOk() (*bool, bool)`

GetDisableCommentOk returns a tuple with the DisableComment field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDisableComment

`func (o *TikTokOptions) SetDisableComment(v bool)`

SetDisableComment sets DisableComment field to given value.

### HasDisableComment

`func (o *TikTokOptions) HasDisableComment() bool`

HasDisableComment returns a boolean if a field has been set.

### GetDisableDuet

`func (o *TikTokOptions) GetDisableDuet() bool`

GetDisableDuet returns the DisableDuet field if non-nil, zero value otherwise.

### GetDisableDuetOk

`func (o *TikTokOptions) GetDisableDuetOk() (*bool, bool)`

GetDisableDuetOk returns a tuple with the DisableDuet field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDisableDuet

`func (o *TikTokOptions) SetDisableDuet(v bool)`

SetDisableDuet sets DisableDuet field to given value.

### HasDisableDuet

`func (o *TikTokOptions) HasDisableDuet() bool`

HasDisableDuet returns a boolean if a field has been set.

### GetDisableStitch

`func (o *TikTokOptions) GetDisableStitch() bool`

GetDisableStitch returns the DisableStitch field if non-nil, zero value otherwise.

### GetDisableStitchOk

`func (o *TikTokOptions) GetDisableStitchOk() (*bool, bool)`

GetDisableStitchOk returns a tuple with the DisableStitch field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDisableStitch

`func (o *TikTokOptions) SetDisableStitch(v bool)`

SetDisableStitch sets DisableStitch field to given value.

### HasDisableStitch

`func (o *TikTokOptions) HasDisableStitch() bool`

HasDisableStitch returns a boolean if a field has been set.

### GetPlatform

`func (o *TikTokOptions) GetPlatform() string`

GetPlatform returns the Platform field if non-nil, zero value otherwise.

### GetPlatformOk

`func (o *TikTokOptions) GetPlatformOk() (*string, bool)`

GetPlatformOk returns a tuple with the Platform field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPlatform

`func (o *TikTokOptions) SetPlatform(v string)`

SetPlatform sets Platform field to given value.


### GetPrivacyLevel

`func (o *TikTokOptions) GetPrivacyLevel() TikTokPrivacyLevel`

GetPrivacyLevel returns the PrivacyLevel field if non-nil, zero value otherwise.

### GetPrivacyLevelOk

`func (o *TikTokOptions) GetPrivacyLevelOk() (*TikTokPrivacyLevel, bool)`

GetPrivacyLevelOk returns a tuple with the PrivacyLevel field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPrivacyLevel

`func (o *TikTokOptions) SetPrivacyLevel(v TikTokPrivacyLevel)`

SetPrivacyLevel sets PrivacyLevel field to given value.

### HasPrivacyLevel

`func (o *TikTokOptions) HasPrivacyLevel() bool`

HasPrivacyLevel returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


