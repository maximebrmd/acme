# NotificationPreferences

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Email** | [**NotificationPreferencesEmail**](NotificationPreferencesEmail.md) |  | 
**EveryPost** | **bool** |  | 

## Methods

### NewNotificationPreferences

`func NewNotificationPreferences(email NotificationPreferencesEmail, everyPost bool, ) *NotificationPreferences`

NewNotificationPreferences instantiates a new NotificationPreferences object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewNotificationPreferencesWithDefaults

`func NewNotificationPreferencesWithDefaults() *NotificationPreferences`

NewNotificationPreferencesWithDefaults instantiates a new NotificationPreferences object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetEmail

`func (o *NotificationPreferences) GetEmail() NotificationPreferencesEmail`

GetEmail returns the Email field if non-nil, zero value otherwise.

### GetEmailOk

`func (o *NotificationPreferences) GetEmailOk() (*NotificationPreferencesEmail, bool)`

GetEmailOk returns a tuple with the Email field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEmail

`func (o *NotificationPreferences) SetEmail(v NotificationPreferencesEmail)`

SetEmail sets Email field to given value.


### GetEveryPost

`func (o *NotificationPreferences) GetEveryPost() bool`

GetEveryPost returns the EveryPost field if non-nil, zero value otherwise.

### GetEveryPostOk

`func (o *NotificationPreferences) GetEveryPostOk() (*bool, bool)`

GetEveryPostOk returns a tuple with the EveryPost field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEveryPost

`func (o *NotificationPreferences) SetEveryPost(v bool)`

SetEveryPost sets EveryPost field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


