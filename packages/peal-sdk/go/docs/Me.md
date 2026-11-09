# Me

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**ImpersonatedBy** | **NullableString** |  | 
**User** | [**MeUser**](MeUser.md) |  | 
**Workspaces** | [**[]Membership**](Membership.md) |  | 

## Methods

### NewMe

`func NewMe(impersonatedBy NullableString, user MeUser, workspaces []Membership, ) *Me`

NewMe instantiates a new Me object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewMeWithDefaults

`func NewMeWithDefaults() *Me`

NewMeWithDefaults instantiates a new Me object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetImpersonatedBy

`func (o *Me) GetImpersonatedBy() string`

GetImpersonatedBy returns the ImpersonatedBy field if non-nil, zero value otherwise.

### GetImpersonatedByOk

`func (o *Me) GetImpersonatedByOk() (*string, bool)`

GetImpersonatedByOk returns a tuple with the ImpersonatedBy field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetImpersonatedBy

`func (o *Me) SetImpersonatedBy(v string)`

SetImpersonatedBy sets ImpersonatedBy field to given value.


### SetImpersonatedByNil

`func (o *Me) SetImpersonatedByNil(b bool)`

 SetImpersonatedByNil sets the value for ImpersonatedBy to be an explicit nil

### UnsetImpersonatedBy
`func (o *Me) UnsetImpersonatedBy()`

UnsetImpersonatedBy ensures that no value is present for ImpersonatedBy, not even an explicit nil
### GetUser

`func (o *Me) GetUser() MeUser`

GetUser returns the User field if non-nil, zero value otherwise.

### GetUserOk

`func (o *Me) GetUserOk() (*MeUser, bool)`

GetUserOk returns a tuple with the User field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetUser

`func (o *Me) SetUser(v MeUser)`

SetUser sets User field to given value.


### GetWorkspaces

`func (o *Me) GetWorkspaces() []Membership`

GetWorkspaces returns the Workspaces field if non-nil, zero value otherwise.

### GetWorkspacesOk

`func (o *Me) GetWorkspacesOk() (*[]Membership, bool)`

GetWorkspacesOk returns a tuple with the Workspaces field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetWorkspaces

`func (o *Me) SetWorkspaces(v []Membership)`

SetWorkspaces sets Workspaces field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


