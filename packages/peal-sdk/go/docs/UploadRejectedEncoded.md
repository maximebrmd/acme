# UploadRejectedEncoded

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Tag** | **string** |  | 
**Reason** | [**RejectionReason**](RejectionReason.md) |  | 

## Methods

### NewUploadRejectedEncoded

`func NewUploadRejectedEncoded(tag string, reason RejectionReason, ) *UploadRejectedEncoded`

NewUploadRejectedEncoded instantiates a new UploadRejectedEncoded object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewUploadRejectedEncodedWithDefaults

`func NewUploadRejectedEncodedWithDefaults() *UploadRejectedEncoded`

NewUploadRejectedEncodedWithDefaults instantiates a new UploadRejectedEncoded object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTag

`func (o *UploadRejectedEncoded) GetTag() string`

GetTag returns the Tag field if non-nil, zero value otherwise.

### GetTagOk

`func (o *UploadRejectedEncoded) GetTagOk() (*string, bool)`

GetTagOk returns a tuple with the Tag field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTag

`func (o *UploadRejectedEncoded) SetTag(v string)`

SetTag sets Tag field to given value.


### GetReason

`func (o *UploadRejectedEncoded) GetReason() RejectionReason`

GetReason returns the Reason field if non-nil, zero value otherwise.

### GetReasonOk

`func (o *UploadRejectedEncoded) GetReasonOk() (*RejectionReason, bool)`

GetReasonOk returns a tuple with the Reason field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetReason

`func (o *UploadRejectedEncoded) SetReason(v RejectionReason)`

SetReason sets Reason field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


