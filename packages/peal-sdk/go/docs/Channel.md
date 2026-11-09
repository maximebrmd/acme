# Channel

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**AvatarUrl** | **NullableString** |  | 
**DisplayName** | **NullableString** |  | 
**Handle** | **string** |  | 
**Id** | **string** |  | 
**Platform** | [**Platform**](Platform.md) |  | 
**Status** | [**ChannelStatus**](ChannelStatus.md) |  | 
**TokenExpiresAt** | **NullableString** |  | 

## Methods

### NewChannel

`func NewChannel(avatarUrl NullableString, displayName NullableString, handle string, id string, platform Platform, status ChannelStatus, tokenExpiresAt NullableString, ) *Channel`

NewChannel instantiates a new Channel object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewChannelWithDefaults

`func NewChannelWithDefaults() *Channel`

NewChannelWithDefaults instantiates a new Channel object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetAvatarUrl

`func (o *Channel) GetAvatarUrl() string`

GetAvatarUrl returns the AvatarUrl field if non-nil, zero value otherwise.

### GetAvatarUrlOk

`func (o *Channel) GetAvatarUrlOk() (*string, bool)`

GetAvatarUrlOk returns a tuple with the AvatarUrl field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAvatarUrl

`func (o *Channel) SetAvatarUrl(v string)`

SetAvatarUrl sets AvatarUrl field to given value.


### SetAvatarUrlNil

`func (o *Channel) SetAvatarUrlNil(b bool)`

 SetAvatarUrlNil sets the value for AvatarUrl to be an explicit nil

### UnsetAvatarUrl
`func (o *Channel) UnsetAvatarUrl()`

UnsetAvatarUrl ensures that no value is present for AvatarUrl, not even an explicit nil
### GetDisplayName

`func (o *Channel) GetDisplayName() string`

GetDisplayName returns the DisplayName field if non-nil, zero value otherwise.

### GetDisplayNameOk

`func (o *Channel) GetDisplayNameOk() (*string, bool)`

GetDisplayNameOk returns a tuple with the DisplayName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDisplayName

`func (o *Channel) SetDisplayName(v string)`

SetDisplayName sets DisplayName field to given value.


### SetDisplayNameNil

`func (o *Channel) SetDisplayNameNil(b bool)`

 SetDisplayNameNil sets the value for DisplayName to be an explicit nil

### UnsetDisplayName
`func (o *Channel) UnsetDisplayName()`

UnsetDisplayName ensures that no value is present for DisplayName, not even an explicit nil
### GetHandle

`func (o *Channel) GetHandle() string`

GetHandle returns the Handle field if non-nil, zero value otherwise.

### GetHandleOk

`func (o *Channel) GetHandleOk() (*string, bool)`

GetHandleOk returns a tuple with the Handle field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetHandle

`func (o *Channel) SetHandle(v string)`

SetHandle sets Handle field to given value.


### GetId

`func (o *Channel) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *Channel) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *Channel) SetId(v string)`

SetId sets Id field to given value.


### GetPlatform

`func (o *Channel) GetPlatform() Platform`

GetPlatform returns the Platform field if non-nil, zero value otherwise.

### GetPlatformOk

`func (o *Channel) GetPlatformOk() (*Platform, bool)`

GetPlatformOk returns a tuple with the Platform field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPlatform

`func (o *Channel) SetPlatform(v Platform)`

SetPlatform sets Platform field to given value.


### GetStatus

`func (o *Channel) GetStatus() ChannelStatus`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *Channel) GetStatusOk() (*ChannelStatus, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *Channel) SetStatus(v ChannelStatus)`

SetStatus sets Status field to given value.


### GetTokenExpiresAt

`func (o *Channel) GetTokenExpiresAt() string`

GetTokenExpiresAt returns the TokenExpiresAt field if non-nil, zero value otherwise.

### GetTokenExpiresAtOk

`func (o *Channel) GetTokenExpiresAtOk() (*string, bool)`

GetTokenExpiresAtOk returns a tuple with the TokenExpiresAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTokenExpiresAt

`func (o *Channel) SetTokenExpiresAt(v string)`

SetTokenExpiresAt sets TokenExpiresAt field to given value.


### SetTokenExpiresAtNil

`func (o *Channel) SetTokenExpiresAtNil(b bool)`

 SetTokenExpiresAtNil sets the value for TokenExpiresAt to be an explicit nil

### UnsetTokenExpiresAt
`func (o *Channel) UnsetTokenExpiresAt()`

UnsetTokenExpiresAt ensures that no value is present for TokenExpiresAt, not even an explicit nil

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


