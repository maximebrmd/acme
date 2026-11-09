# TargetOptions

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**CategoryId** | Pointer to **string** |  | [optional] 
**ContainsSyntheticMedia** | Pointer to **bool** |  | [optional] 
**MadeForKids** | Pointer to **bool** |  | [optional] 
**NotifySubscribers** | Pointer to **bool** |  | [optional] 
**Platform** | **string** |  | 
**Privacy** | Pointer to [**YouTubePrivacy**](YouTubePrivacy.md) |  | [optional] 
**Tags** | Pointer to **[]string** |  | [optional] 
**Title** | Pointer to **string** |  | [optional] 
**AiGenerated** | Pointer to **bool** |  | [optional] 
**BrandContent** | Pointer to **bool** |  | [optional] 
**BrandOrganic** | Pointer to **bool** |  | [optional] 
**CommercialContent** | Pointer to **bool** |  | [optional] 
**DisableComment** | Pointer to **bool** |  | [optional] 
**DisableDuet** | Pointer to **bool** |  | [optional] 
**DisableStitch** | Pointer to **bool** |  | [optional] 
**PrivacyLevel** | Pointer to [**TikTokPrivacyLevel**](TikTokPrivacyLevel.md) |  | [optional] 

## Methods

### NewTargetOptions

`func NewTargetOptions(platform string, ) *TargetOptions`

NewTargetOptions instantiates a new TargetOptions object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewTargetOptionsWithDefaults

`func NewTargetOptionsWithDefaults() *TargetOptions`

NewTargetOptionsWithDefaults instantiates a new TargetOptions object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetCategoryId

`func (o *TargetOptions) GetCategoryId() string`

GetCategoryId returns the CategoryId field if non-nil, zero value otherwise.

### GetCategoryIdOk

`func (o *TargetOptions) GetCategoryIdOk() (*string, bool)`

GetCategoryIdOk returns a tuple with the CategoryId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCategoryId

`func (o *TargetOptions) SetCategoryId(v string)`

SetCategoryId sets CategoryId field to given value.

### HasCategoryId

`func (o *TargetOptions) HasCategoryId() bool`

HasCategoryId returns a boolean if a field has been set.

### GetContainsSyntheticMedia

`func (o *TargetOptions) GetContainsSyntheticMedia() bool`

GetContainsSyntheticMedia returns the ContainsSyntheticMedia field if non-nil, zero value otherwise.

### GetContainsSyntheticMediaOk

`func (o *TargetOptions) GetContainsSyntheticMediaOk() (*bool, bool)`

GetContainsSyntheticMediaOk returns a tuple with the ContainsSyntheticMedia field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContainsSyntheticMedia

`func (o *TargetOptions) SetContainsSyntheticMedia(v bool)`

SetContainsSyntheticMedia sets ContainsSyntheticMedia field to given value.

### HasContainsSyntheticMedia

`func (o *TargetOptions) HasContainsSyntheticMedia() bool`

HasContainsSyntheticMedia returns a boolean if a field has been set.

### GetMadeForKids

`func (o *TargetOptions) GetMadeForKids() bool`

GetMadeForKids returns the MadeForKids field if non-nil, zero value otherwise.

### GetMadeForKidsOk

`func (o *TargetOptions) GetMadeForKidsOk() (*bool, bool)`

GetMadeForKidsOk returns a tuple with the MadeForKids field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMadeForKids

`func (o *TargetOptions) SetMadeForKids(v bool)`

SetMadeForKids sets MadeForKids field to given value.

### HasMadeForKids

`func (o *TargetOptions) HasMadeForKids() bool`

HasMadeForKids returns a boolean if a field has been set.

### GetNotifySubscribers

`func (o *TargetOptions) GetNotifySubscribers() bool`

GetNotifySubscribers returns the NotifySubscribers field if non-nil, zero value otherwise.

### GetNotifySubscribersOk

`func (o *TargetOptions) GetNotifySubscribersOk() (*bool, bool)`

GetNotifySubscribersOk returns a tuple with the NotifySubscribers field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNotifySubscribers

`func (o *TargetOptions) SetNotifySubscribers(v bool)`

SetNotifySubscribers sets NotifySubscribers field to given value.

### HasNotifySubscribers

`func (o *TargetOptions) HasNotifySubscribers() bool`

HasNotifySubscribers returns a boolean if a field has been set.

### GetPlatform

`func (o *TargetOptions) GetPlatform() string`

GetPlatform returns the Platform field if non-nil, zero value otherwise.

### GetPlatformOk

`func (o *TargetOptions) GetPlatformOk() (*string, bool)`

GetPlatformOk returns a tuple with the Platform field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPlatform

`func (o *TargetOptions) SetPlatform(v string)`

SetPlatform sets Platform field to given value.


### GetPrivacy

`func (o *TargetOptions) GetPrivacy() YouTubePrivacy`

GetPrivacy returns the Privacy field if non-nil, zero value otherwise.

### GetPrivacyOk

`func (o *TargetOptions) GetPrivacyOk() (*YouTubePrivacy, bool)`

GetPrivacyOk returns a tuple with the Privacy field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPrivacy

`func (o *TargetOptions) SetPrivacy(v YouTubePrivacy)`

SetPrivacy sets Privacy field to given value.

### HasPrivacy

`func (o *TargetOptions) HasPrivacy() bool`

HasPrivacy returns a boolean if a field has been set.

### GetTags

`func (o *TargetOptions) GetTags() []string`

GetTags returns the Tags field if non-nil, zero value otherwise.

### GetTagsOk

`func (o *TargetOptions) GetTagsOk() (*[]string, bool)`

GetTagsOk returns a tuple with the Tags field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTags

`func (o *TargetOptions) SetTags(v []string)`

SetTags sets Tags field to given value.

### HasTags

`func (o *TargetOptions) HasTags() bool`

HasTags returns a boolean if a field has been set.

### GetTitle

`func (o *TargetOptions) GetTitle() string`

GetTitle returns the Title field if non-nil, zero value otherwise.

### GetTitleOk

`func (o *TargetOptions) GetTitleOk() (*string, bool)`

GetTitleOk returns a tuple with the Title field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTitle

`func (o *TargetOptions) SetTitle(v string)`

SetTitle sets Title field to given value.

### HasTitle

`func (o *TargetOptions) HasTitle() bool`

HasTitle returns a boolean if a field has been set.

### GetAiGenerated

`func (o *TargetOptions) GetAiGenerated() bool`

GetAiGenerated returns the AiGenerated field if non-nil, zero value otherwise.

### GetAiGeneratedOk

`func (o *TargetOptions) GetAiGeneratedOk() (*bool, bool)`

GetAiGeneratedOk returns a tuple with the AiGenerated field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAiGenerated

`func (o *TargetOptions) SetAiGenerated(v bool)`

SetAiGenerated sets AiGenerated field to given value.

### HasAiGenerated

`func (o *TargetOptions) HasAiGenerated() bool`

HasAiGenerated returns a boolean if a field has been set.

### GetBrandContent

`func (o *TargetOptions) GetBrandContent() bool`

GetBrandContent returns the BrandContent field if non-nil, zero value otherwise.

### GetBrandContentOk

`func (o *TargetOptions) GetBrandContentOk() (*bool, bool)`

GetBrandContentOk returns a tuple with the BrandContent field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetBrandContent

`func (o *TargetOptions) SetBrandContent(v bool)`

SetBrandContent sets BrandContent field to given value.

### HasBrandContent

`func (o *TargetOptions) HasBrandContent() bool`

HasBrandContent returns a boolean if a field has been set.

### GetBrandOrganic

`func (o *TargetOptions) GetBrandOrganic() bool`

GetBrandOrganic returns the BrandOrganic field if non-nil, zero value otherwise.

### GetBrandOrganicOk

`func (o *TargetOptions) GetBrandOrganicOk() (*bool, bool)`

GetBrandOrganicOk returns a tuple with the BrandOrganic field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetBrandOrganic

`func (o *TargetOptions) SetBrandOrganic(v bool)`

SetBrandOrganic sets BrandOrganic field to given value.

### HasBrandOrganic

`func (o *TargetOptions) HasBrandOrganic() bool`

HasBrandOrganic returns a boolean if a field has been set.

### GetCommercialContent

`func (o *TargetOptions) GetCommercialContent() bool`

GetCommercialContent returns the CommercialContent field if non-nil, zero value otherwise.

### GetCommercialContentOk

`func (o *TargetOptions) GetCommercialContentOk() (*bool, bool)`

GetCommercialContentOk returns a tuple with the CommercialContent field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCommercialContent

`func (o *TargetOptions) SetCommercialContent(v bool)`

SetCommercialContent sets CommercialContent field to given value.

### HasCommercialContent

`func (o *TargetOptions) HasCommercialContent() bool`

HasCommercialContent returns a boolean if a field has been set.

### GetDisableComment

`func (o *TargetOptions) GetDisableComment() bool`

GetDisableComment returns the DisableComment field if non-nil, zero value otherwise.

### GetDisableCommentOk

`func (o *TargetOptions) GetDisableCommentOk() (*bool, bool)`

GetDisableCommentOk returns a tuple with the DisableComment field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDisableComment

`func (o *TargetOptions) SetDisableComment(v bool)`

SetDisableComment sets DisableComment field to given value.

### HasDisableComment

`func (o *TargetOptions) HasDisableComment() bool`

HasDisableComment returns a boolean if a field has been set.

### GetDisableDuet

`func (o *TargetOptions) GetDisableDuet() bool`

GetDisableDuet returns the DisableDuet field if non-nil, zero value otherwise.

### GetDisableDuetOk

`func (o *TargetOptions) GetDisableDuetOk() (*bool, bool)`

GetDisableDuetOk returns a tuple with the DisableDuet field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDisableDuet

`func (o *TargetOptions) SetDisableDuet(v bool)`

SetDisableDuet sets DisableDuet field to given value.

### HasDisableDuet

`func (o *TargetOptions) HasDisableDuet() bool`

HasDisableDuet returns a boolean if a field has been set.

### GetDisableStitch

`func (o *TargetOptions) GetDisableStitch() bool`

GetDisableStitch returns the DisableStitch field if non-nil, zero value otherwise.

### GetDisableStitchOk

`func (o *TargetOptions) GetDisableStitchOk() (*bool, bool)`

GetDisableStitchOk returns a tuple with the DisableStitch field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDisableStitch

`func (o *TargetOptions) SetDisableStitch(v bool)`

SetDisableStitch sets DisableStitch field to given value.

### HasDisableStitch

`func (o *TargetOptions) HasDisableStitch() bool`

HasDisableStitch returns a boolean if a field has been set.

### GetPrivacyLevel

`func (o *TargetOptions) GetPrivacyLevel() TikTokPrivacyLevel`

GetPrivacyLevel returns the PrivacyLevel field if non-nil, zero value otherwise.

### GetPrivacyLevelOk

`func (o *TargetOptions) GetPrivacyLevelOk() (*TikTokPrivacyLevel, bool)`

GetPrivacyLevelOk returns a tuple with the PrivacyLevel field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPrivacyLevel

`func (o *TargetOptions) SetPrivacyLevel(v TikTokPrivacyLevel)`

SetPrivacyLevel sets PrivacyLevel field to given value.

### HasPrivacyLevel

`func (o *TargetOptions) HasPrivacyLevel() bool`

HasPrivacyLevel returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


