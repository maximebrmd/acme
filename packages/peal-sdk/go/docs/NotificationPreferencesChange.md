# NotificationPreferencesChange

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Email** | Pointer to [**NotificationPreferencesChangeEmail**](NotificationPreferencesChangeEmail.md) |  | [optional] 
**EveryPost** | Pointer to **bool** |  | [optional] 

## Methods

### NewNotificationPreferencesChange

`func NewNotificationPreferencesChange() *NotificationPreferencesChange`

NewNotificationPreferencesChange instantiates a new NotificationPreferencesChange object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewNotificationPreferencesChangeWithDefaults

`func NewNotificationPreferencesChangeWithDefaults() *NotificationPreferencesChange`

NewNotificationPreferencesChangeWithDefaults instantiates a new NotificationPreferencesChange object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetEmail

`func (o *NotificationPreferencesChange) GetEmail() NotificationPreferencesChangeEmail`

GetEmail returns the Email field if non-nil, zero value otherwise.

### GetEmailOk

`func (o *NotificationPreferencesChange) GetEmailOk() (*NotificationPreferencesChangeEmail, bool)`

GetEmailOk returns a tuple with the Email field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEmail

`func (o *NotificationPreferencesChange) SetEmail(v NotificationPreferencesChangeEmail)`

SetEmail sets Email field to given value.

### HasEmail

`func (o *NotificationPreferencesChange) HasEmail() bool`

HasEmail returns a boolean if a field has been set.

### GetEveryPost

`func (o *NotificationPreferencesChange) GetEveryPost() bool`

GetEveryPost returns the EveryPost field if non-nil, zero value otherwise.

### GetEveryPostOk

`func (o *NotificationPreferencesChange) GetEveryPostOk() (*bool, bool)`

GetEveryPostOk returns a tuple with the EveryPost field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEveryPost

`func (o *NotificationPreferencesChange) SetEveryPost(v bool)`

SetEveryPost sets EveryPost field to given value.

### HasEveryPost

`func (o *NotificationPreferencesChange) HasEveryPost() bool`

HasEveryPost returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


