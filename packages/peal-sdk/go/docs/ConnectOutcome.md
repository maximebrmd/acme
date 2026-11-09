# ConnectOutcome

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Tag** | **string** |  | 
**Channel** | [**Channel**](Channel.md) |  | 
**Accounts** | [**[]ChoosableAccount**](ChoosableAccount.md) |  | 
**ExpiresAt** | **string** |  | 
**Selection** | **string** |  | 

## Methods

### NewConnectOutcome

`func NewConnectOutcome(tag string, channel Channel, accounts []ChoosableAccount, expiresAt string, selection string, ) *ConnectOutcome`

NewConnectOutcome instantiates a new ConnectOutcome object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewConnectOutcomeWithDefaults

`func NewConnectOutcomeWithDefaults() *ConnectOutcome`

NewConnectOutcomeWithDefaults instantiates a new ConnectOutcome object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTag

`func (o *ConnectOutcome) GetTag() string`

GetTag returns the Tag field if non-nil, zero value otherwise.

### GetTagOk

`func (o *ConnectOutcome) GetTagOk() (*string, bool)`

GetTagOk returns a tuple with the Tag field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTag

`func (o *ConnectOutcome) SetTag(v string)`

SetTag sets Tag field to given value.


### GetChannel

`func (o *ConnectOutcome) GetChannel() Channel`

GetChannel returns the Channel field if non-nil, zero value otherwise.

### GetChannelOk

`func (o *ConnectOutcome) GetChannelOk() (*Channel, bool)`

GetChannelOk returns a tuple with the Channel field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetChannel

`func (o *ConnectOutcome) SetChannel(v Channel)`

SetChannel sets Channel field to given value.


### GetAccounts

`func (o *ConnectOutcome) GetAccounts() []ChoosableAccount`

GetAccounts returns the Accounts field if non-nil, zero value otherwise.

### GetAccountsOk

`func (o *ConnectOutcome) GetAccountsOk() (*[]ChoosableAccount, bool)`

GetAccountsOk returns a tuple with the Accounts field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAccounts

`func (o *ConnectOutcome) SetAccounts(v []ChoosableAccount)`

SetAccounts sets Accounts field to given value.


### GetExpiresAt

`func (o *ConnectOutcome) GetExpiresAt() string`

GetExpiresAt returns the ExpiresAt field if non-nil, zero value otherwise.

### GetExpiresAtOk

`func (o *ConnectOutcome) GetExpiresAtOk() (*string, bool)`

GetExpiresAtOk returns a tuple with the ExpiresAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetExpiresAt

`func (o *ConnectOutcome) SetExpiresAt(v string)`

SetExpiresAt sets ExpiresAt field to given value.


### GetSelection

`func (o *ConnectOutcome) GetSelection() string`

GetSelection returns the Selection field if non-nil, zero value otherwise.

### GetSelectionOk

`func (o *ConnectOutcome) GetSelectionOk() (*string, bool)`

GetSelectionOk returns a tuple with the Selection field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSelection

`func (o *ConnectOutcome) SetSelection(v string)`

SetSelection sets Selection field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


