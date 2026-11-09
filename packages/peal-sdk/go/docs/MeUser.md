# MeUser

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Email** | **string** |  | 
**EmailVerified** | **bool** |  | 
**Id** | **string** |  | 
**Image** | **NullableString** |  | 
**Locale** | **string** |  | 
**Name** | **string** |  | 

## Methods

### NewMeUser

`func NewMeUser(email string, emailVerified bool, id string, image NullableString, locale string, name string, ) *MeUser`

NewMeUser instantiates a new MeUser object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewMeUserWithDefaults

`func NewMeUserWithDefaults() *MeUser`

NewMeUserWithDefaults instantiates a new MeUser object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetEmail

`func (o *MeUser) GetEmail() string`

GetEmail returns the Email field if non-nil, zero value otherwise.

### GetEmailOk

`func (o *MeUser) GetEmailOk() (*string, bool)`

GetEmailOk returns a tuple with the Email field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEmail

`func (o *MeUser) SetEmail(v string)`

SetEmail sets Email field to given value.


### GetEmailVerified

`func (o *MeUser) GetEmailVerified() bool`

GetEmailVerified returns the EmailVerified field if non-nil, zero value otherwise.

### GetEmailVerifiedOk

`func (o *MeUser) GetEmailVerifiedOk() (*bool, bool)`

GetEmailVerifiedOk returns a tuple with the EmailVerified field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEmailVerified

`func (o *MeUser) SetEmailVerified(v bool)`

SetEmailVerified sets EmailVerified field to given value.


### GetId

`func (o *MeUser) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *MeUser) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *MeUser) SetId(v string)`

SetId sets Id field to given value.


### GetImage

`func (o *MeUser) GetImage() string`

GetImage returns the Image field if non-nil, zero value otherwise.

### GetImageOk

`func (o *MeUser) GetImageOk() (*string, bool)`

GetImageOk returns a tuple with the Image field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetImage

`func (o *MeUser) SetImage(v string)`

SetImage sets Image field to given value.


### SetImageNil

`func (o *MeUser) SetImageNil(b bool)`

 SetImageNil sets the value for Image to be an explicit nil

### UnsetImage
`func (o *MeUser) UnsetImage()`

UnsetImage ensures that no value is present for Image, not even an explicit nil
### GetLocale

`func (o *MeUser) GetLocale() string`

GetLocale returns the Locale field if non-nil, zero value otherwise.

### GetLocaleOk

`func (o *MeUser) GetLocaleOk() (*string, bool)`

GetLocaleOk returns a tuple with the Locale field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLocale

`func (o *MeUser) SetLocale(v string)`

SetLocale sets Locale field to given value.


### GetName

`func (o *MeUser) GetName() string`

GetName returns the Name field if non-nil, zero value otherwise.

### GetNameOk

`func (o *MeUser) GetNameOk() (*string, bool)`

GetNameOk returns a tuple with the Name field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetName

`func (o *MeUser) SetName(v string)`

SetName sets Name field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


