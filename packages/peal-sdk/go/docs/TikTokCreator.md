# TikTokCreator

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**AvatarUrl** | **NullableString** |  | 
**CommentDisabled** | **bool** |  | 
**DuetDisabled** | **bool** |  | 
**MaxVideoDurationMs** | **NullableInt32** |  | 
**Nickname** | **string** |  | 
**PrivacyLevels** | [**[]TikTokPrivacyLevel**](TikTokPrivacyLevel.md) |  | 
**StitchDisabled** | **bool** |  | 
**Username** | **string** |  | 

## Methods

### NewTikTokCreator

`func NewTikTokCreator(avatarUrl NullableString, commentDisabled bool, duetDisabled bool, maxVideoDurationMs NullableInt32, nickname string, privacyLevels []TikTokPrivacyLevel, stitchDisabled bool, username string, ) *TikTokCreator`

NewTikTokCreator instantiates a new TikTokCreator object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewTikTokCreatorWithDefaults

`func NewTikTokCreatorWithDefaults() *TikTokCreator`

NewTikTokCreatorWithDefaults instantiates a new TikTokCreator object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetAvatarUrl

`func (o *TikTokCreator) GetAvatarUrl() string`

GetAvatarUrl returns the AvatarUrl field if non-nil, zero value otherwise.

### GetAvatarUrlOk

`func (o *TikTokCreator) GetAvatarUrlOk() (*string, bool)`

GetAvatarUrlOk returns a tuple with the AvatarUrl field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAvatarUrl

`func (o *TikTokCreator) SetAvatarUrl(v string)`

SetAvatarUrl sets AvatarUrl field to given value.


### SetAvatarUrlNil

`func (o *TikTokCreator) SetAvatarUrlNil(b bool)`

 SetAvatarUrlNil sets the value for AvatarUrl to be an explicit nil

### UnsetAvatarUrl
`func (o *TikTokCreator) UnsetAvatarUrl()`

UnsetAvatarUrl ensures that no value is present for AvatarUrl, not even an explicit nil
### GetCommentDisabled

`func (o *TikTokCreator) GetCommentDisabled() bool`

GetCommentDisabled returns the CommentDisabled field if non-nil, zero value otherwise.

### GetCommentDisabledOk

`func (o *TikTokCreator) GetCommentDisabledOk() (*bool, bool)`

GetCommentDisabledOk returns a tuple with the CommentDisabled field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCommentDisabled

`func (o *TikTokCreator) SetCommentDisabled(v bool)`

SetCommentDisabled sets CommentDisabled field to given value.


### GetDuetDisabled

`func (o *TikTokCreator) GetDuetDisabled() bool`

GetDuetDisabled returns the DuetDisabled field if non-nil, zero value otherwise.

### GetDuetDisabledOk

`func (o *TikTokCreator) GetDuetDisabledOk() (*bool, bool)`

GetDuetDisabledOk returns a tuple with the DuetDisabled field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDuetDisabled

`func (o *TikTokCreator) SetDuetDisabled(v bool)`

SetDuetDisabled sets DuetDisabled field to given value.


### GetMaxVideoDurationMs

`func (o *TikTokCreator) GetMaxVideoDurationMs() int32`

GetMaxVideoDurationMs returns the MaxVideoDurationMs field if non-nil, zero value otherwise.

### GetMaxVideoDurationMsOk

`func (o *TikTokCreator) GetMaxVideoDurationMsOk() (*int32, bool)`

GetMaxVideoDurationMsOk returns a tuple with the MaxVideoDurationMs field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMaxVideoDurationMs

`func (o *TikTokCreator) SetMaxVideoDurationMs(v int32)`

SetMaxVideoDurationMs sets MaxVideoDurationMs field to given value.


### SetMaxVideoDurationMsNil

`func (o *TikTokCreator) SetMaxVideoDurationMsNil(b bool)`

 SetMaxVideoDurationMsNil sets the value for MaxVideoDurationMs to be an explicit nil

### UnsetMaxVideoDurationMs
`func (o *TikTokCreator) UnsetMaxVideoDurationMs()`

UnsetMaxVideoDurationMs ensures that no value is present for MaxVideoDurationMs, not even an explicit nil
### GetNickname

`func (o *TikTokCreator) GetNickname() string`

GetNickname returns the Nickname field if non-nil, zero value otherwise.

### GetNicknameOk

`func (o *TikTokCreator) GetNicknameOk() (*string, bool)`

GetNicknameOk returns a tuple with the Nickname field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNickname

`func (o *TikTokCreator) SetNickname(v string)`

SetNickname sets Nickname field to given value.


### GetPrivacyLevels

`func (o *TikTokCreator) GetPrivacyLevels() []TikTokPrivacyLevel`

GetPrivacyLevels returns the PrivacyLevels field if non-nil, zero value otherwise.

### GetPrivacyLevelsOk

`func (o *TikTokCreator) GetPrivacyLevelsOk() (*[]TikTokPrivacyLevel, bool)`

GetPrivacyLevelsOk returns a tuple with the PrivacyLevels field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPrivacyLevels

`func (o *TikTokCreator) SetPrivacyLevels(v []TikTokPrivacyLevel)`

SetPrivacyLevels sets PrivacyLevels field to given value.


### GetStitchDisabled

`func (o *TikTokCreator) GetStitchDisabled() bool`

GetStitchDisabled returns the StitchDisabled field if non-nil, zero value otherwise.

### GetStitchDisabledOk

`func (o *TikTokCreator) GetStitchDisabledOk() (*bool, bool)`

GetStitchDisabledOk returns a tuple with the StitchDisabled field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStitchDisabled

`func (o *TikTokCreator) SetStitchDisabled(v bool)`

SetStitchDisabled sets StitchDisabled field to given value.


### GetUsername

`func (o *TikTokCreator) GetUsername() string`

GetUsername returns the Username field if non-nil, zero value otherwise.

### GetUsernameOk

`func (o *TikTokCreator) GetUsernameOk() (*string, bool)`

GetUsernameOk returns a tuple with the Username field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetUsername

`func (o *TikTokCreator) SetUsername(v string)`

SetUsername sets Username field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


