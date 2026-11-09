# ConnectChannel

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Connection** | Pointer to [**InstagramConnection**](InstagramConnection.md) |  | [optional] 
**Handle** | Pointer to **string** |  | [optional] 
**Instance** | Pointer to **string** |  | [optional] 

## Methods

### NewConnectChannel

`func NewConnectChannel() *ConnectChannel`

NewConnectChannel instantiates a new ConnectChannel object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewConnectChannelWithDefaults

`func NewConnectChannelWithDefaults() *ConnectChannel`

NewConnectChannelWithDefaults instantiates a new ConnectChannel object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetConnection

`func (o *ConnectChannel) GetConnection() InstagramConnection`

GetConnection returns the Connection field if non-nil, zero value otherwise.

### GetConnectionOk

`func (o *ConnectChannel) GetConnectionOk() (*InstagramConnection, bool)`

GetConnectionOk returns a tuple with the Connection field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetConnection

`func (o *ConnectChannel) SetConnection(v InstagramConnection)`

SetConnection sets Connection field to given value.

### HasConnection

`func (o *ConnectChannel) HasConnection() bool`

HasConnection returns a boolean if a field has been set.

### GetHandle

`func (o *ConnectChannel) GetHandle() string`

GetHandle returns the Handle field if non-nil, zero value otherwise.

### GetHandleOk

`func (o *ConnectChannel) GetHandleOk() (*string, bool)`

GetHandleOk returns a tuple with the Handle field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetHandle

`func (o *ConnectChannel) SetHandle(v string)`

SetHandle sets Handle field to given value.

### HasHandle

`func (o *ConnectChannel) HasHandle() bool`

HasHandle returns a boolean if a field has been set.

### GetInstance

`func (o *ConnectChannel) GetInstance() string`

GetInstance returns the Instance field if non-nil, zero value otherwise.

### GetInstanceOk

`func (o *ConnectChannel) GetInstanceOk() (*string, bool)`

GetInstanceOk returns a tuple with the Instance field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetInstance

`func (o *ConnectChannel) SetInstance(v string)`

SetInstance sets Instance field to given value.

### HasInstance

`func (o *ConnectChannel) HasInstance() bool`

HasInstance returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


