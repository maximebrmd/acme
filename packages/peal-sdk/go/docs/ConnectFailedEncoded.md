# ConnectFailedEncoded

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Tag** | **string** |  | 
**Reason** | [**ConnectFailureReason**](ConnectFailureReason.md) |  | 

## Methods

### NewConnectFailedEncoded

`func NewConnectFailedEncoded(tag string, reason ConnectFailureReason, ) *ConnectFailedEncoded`

NewConnectFailedEncoded instantiates a new ConnectFailedEncoded object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewConnectFailedEncodedWithDefaults

`func NewConnectFailedEncodedWithDefaults() *ConnectFailedEncoded`

NewConnectFailedEncodedWithDefaults instantiates a new ConnectFailedEncoded object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTag

`func (o *ConnectFailedEncoded) GetTag() string`

GetTag returns the Tag field if non-nil, zero value otherwise.

### GetTagOk

`func (o *ConnectFailedEncoded) GetTagOk() (*string, bool)`

GetTagOk returns a tuple with the Tag field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTag

`func (o *ConnectFailedEncoded) SetTag(v string)`

SetTag sets Tag field to given value.


### GetReason

`func (o *ConnectFailedEncoded) GetReason() ConnectFailureReason`

GetReason returns the Reason field if non-nil, zero value otherwise.

### GetReasonOk

`func (o *ConnectFailedEncoded) GetReasonOk() (*ConnectFailureReason, bool)`

GetReasonOk returns a tuple with the Reason field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetReason

`func (o *ConnectFailedEncoded) SetReason(v ConnectFailureReason)`

SetReason sets Reason field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


