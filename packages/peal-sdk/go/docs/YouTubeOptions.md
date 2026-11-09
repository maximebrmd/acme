# YouTubeOptions

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

## Methods

### NewYouTubeOptions

`func NewYouTubeOptions(platform string, ) *YouTubeOptions`

NewYouTubeOptions instantiates a new YouTubeOptions object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewYouTubeOptionsWithDefaults

`func NewYouTubeOptionsWithDefaults() *YouTubeOptions`

NewYouTubeOptionsWithDefaults instantiates a new YouTubeOptions object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetCategoryId

`func (o *YouTubeOptions) GetCategoryId() string`

GetCategoryId returns the CategoryId field if non-nil, zero value otherwise.

### GetCategoryIdOk

`func (o *YouTubeOptions) GetCategoryIdOk() (*string, bool)`

GetCategoryIdOk returns a tuple with the CategoryId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCategoryId

`func (o *YouTubeOptions) SetCategoryId(v string)`

SetCategoryId sets CategoryId field to given value.

### HasCategoryId

`func (o *YouTubeOptions) HasCategoryId() bool`

HasCategoryId returns a boolean if a field has been set.

### GetContainsSyntheticMedia

`func (o *YouTubeOptions) GetContainsSyntheticMedia() bool`

GetContainsSyntheticMedia returns the ContainsSyntheticMedia field if non-nil, zero value otherwise.

### GetContainsSyntheticMediaOk

`func (o *YouTubeOptions) GetContainsSyntheticMediaOk() (*bool, bool)`

GetContainsSyntheticMediaOk returns a tuple with the ContainsSyntheticMedia field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContainsSyntheticMedia

`func (o *YouTubeOptions) SetContainsSyntheticMedia(v bool)`

SetContainsSyntheticMedia sets ContainsSyntheticMedia field to given value.

### HasContainsSyntheticMedia

`func (o *YouTubeOptions) HasContainsSyntheticMedia() bool`

HasContainsSyntheticMedia returns a boolean if a field has been set.

### GetMadeForKids

`func (o *YouTubeOptions) GetMadeForKids() bool`

GetMadeForKids returns the MadeForKids field if non-nil, zero value otherwise.

### GetMadeForKidsOk

`func (o *YouTubeOptions) GetMadeForKidsOk() (*bool, bool)`

GetMadeForKidsOk returns a tuple with the MadeForKids field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMadeForKids

`func (o *YouTubeOptions) SetMadeForKids(v bool)`

SetMadeForKids sets MadeForKids field to given value.

### HasMadeForKids

`func (o *YouTubeOptions) HasMadeForKids() bool`

HasMadeForKids returns a boolean if a field has been set.

### GetNotifySubscribers

`func (o *YouTubeOptions) GetNotifySubscribers() bool`

GetNotifySubscribers returns the NotifySubscribers field if non-nil, zero value otherwise.

### GetNotifySubscribersOk

`func (o *YouTubeOptions) GetNotifySubscribersOk() (*bool, bool)`

GetNotifySubscribersOk returns a tuple with the NotifySubscribers field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNotifySubscribers

`func (o *YouTubeOptions) SetNotifySubscribers(v bool)`

SetNotifySubscribers sets NotifySubscribers field to given value.

### HasNotifySubscribers

`func (o *YouTubeOptions) HasNotifySubscribers() bool`

HasNotifySubscribers returns a boolean if a field has been set.

### GetPlatform

`func (o *YouTubeOptions) GetPlatform() string`

GetPlatform returns the Platform field if non-nil, zero value otherwise.

### GetPlatformOk

`func (o *YouTubeOptions) GetPlatformOk() (*string, bool)`

GetPlatformOk returns a tuple with the Platform field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPlatform

`func (o *YouTubeOptions) SetPlatform(v string)`

SetPlatform sets Platform field to given value.


### GetPrivacy

`func (o *YouTubeOptions) GetPrivacy() YouTubePrivacy`

GetPrivacy returns the Privacy field if non-nil, zero value otherwise.

### GetPrivacyOk

`func (o *YouTubeOptions) GetPrivacyOk() (*YouTubePrivacy, bool)`

GetPrivacyOk returns a tuple with the Privacy field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPrivacy

`func (o *YouTubeOptions) SetPrivacy(v YouTubePrivacy)`

SetPrivacy sets Privacy field to given value.

### HasPrivacy

`func (o *YouTubeOptions) HasPrivacy() bool`

HasPrivacy returns a boolean if a field has been set.

### GetTags

`func (o *YouTubeOptions) GetTags() []string`

GetTags returns the Tags field if non-nil, zero value otherwise.

### GetTagsOk

`func (o *YouTubeOptions) GetTagsOk() (*[]string, bool)`

GetTagsOk returns a tuple with the Tags field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTags

`func (o *YouTubeOptions) SetTags(v []string)`

SetTags sets Tags field to given value.

### HasTags

`func (o *YouTubeOptions) HasTags() bool`

HasTags returns a boolean if a field has been set.

### GetTitle

`func (o *YouTubeOptions) GetTitle() string`

GetTitle returns the Title field if non-nil, zero value otherwise.

### GetTitleOk

`func (o *YouTubeOptions) GetTitleOk() (*string, bool)`

GetTitleOk returns a tuple with the Title field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTitle

`func (o *YouTubeOptions) SetTitle(v string)`

SetTitle sets Title field to given value.

### HasTitle

`func (o *YouTubeOptions) HasTitle() bool`

HasTitle returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


