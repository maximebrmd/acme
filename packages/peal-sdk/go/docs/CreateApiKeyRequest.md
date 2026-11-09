# CreateApiKeyRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**ExpiresInDays** | Pointer to **int32** |  | [optional] 
**Name** | **string** |  | 
**Permissions** | [**[]Permission**](Permission.md) |  | 

## Methods

### NewCreateApiKeyRequest

`func NewCreateApiKeyRequest(name string, permissions []Permission, ) *CreateApiKeyRequest`

NewCreateApiKeyRequest instantiates a new CreateApiKeyRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewCreateApiKeyRequestWithDefaults

`func NewCreateApiKeyRequestWithDefaults() *CreateApiKeyRequest`

NewCreateApiKeyRequestWithDefaults instantiates a new CreateApiKeyRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetExpiresInDays

`func (o *CreateApiKeyRequest) GetExpiresInDays() int32`

GetExpiresInDays returns the ExpiresInDays field if non-nil, zero value otherwise.

### GetExpiresInDaysOk

`func (o *CreateApiKeyRequest) GetExpiresInDaysOk() (*int32, bool)`

GetExpiresInDaysOk returns a tuple with the ExpiresInDays field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetExpiresInDays

`func (o *CreateApiKeyRequest) SetExpiresInDays(v int32)`

SetExpiresInDays sets ExpiresInDays field to given value.

### HasExpiresInDays

`func (o *CreateApiKeyRequest) HasExpiresInDays() bool`

HasExpiresInDays returns a boolean if a field has been set.

### GetName

`func (o *CreateApiKeyRequest) GetName() string`

GetName returns the Name field if non-nil, zero value otherwise.

### GetNameOk

`func (o *CreateApiKeyRequest) GetNameOk() (*string, bool)`

GetNameOk returns a tuple with the Name field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetName

`func (o *CreateApiKeyRequest) SetName(v string)`

SetName sets Name field to given value.


### GetPermissions

`func (o *CreateApiKeyRequest) GetPermissions() []Permission`

GetPermissions returns the Permissions field if non-nil, zero value otherwise.

### GetPermissionsOk

`func (o *CreateApiKeyRequest) GetPermissionsOk() (*[]Permission, bool)`

GetPermissionsOk returns a tuple with the Permissions field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPermissions

`func (o *CreateApiKeyRequest) SetPermissions(v []Permission)`

SetPermissions sets Permissions field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


