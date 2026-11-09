# UploadPart

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**ByteSize** | **int32** |  | 
**PartNumber** | **int32** |  | 
**Request** | [**SignedRequest**](SignedRequest.md) |  | 

## Methods

### NewUploadPart

`func NewUploadPart(byteSize int32, partNumber int32, request SignedRequest, ) *UploadPart`

NewUploadPart instantiates a new UploadPart object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewUploadPartWithDefaults

`func NewUploadPartWithDefaults() *UploadPart`

NewUploadPartWithDefaults instantiates a new UploadPart object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetByteSize

`func (o *UploadPart) GetByteSize() int32`

GetByteSize returns the ByteSize field if non-nil, zero value otherwise.

### GetByteSizeOk

`func (o *UploadPart) GetByteSizeOk() (*int32, bool)`

GetByteSizeOk returns a tuple with the ByteSize field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetByteSize

`func (o *UploadPart) SetByteSize(v int32)`

SetByteSize sets ByteSize field to given value.


### GetPartNumber

`func (o *UploadPart) GetPartNumber() int32`

GetPartNumber returns the PartNumber field if non-nil, zero value otherwise.

### GetPartNumberOk

`func (o *UploadPart) GetPartNumberOk() (*int32, bool)`

GetPartNumberOk returns a tuple with the PartNumber field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPartNumber

`func (o *UploadPart) SetPartNumber(v int32)`

SetPartNumber sets PartNumber field to given value.


### GetRequest

`func (o *UploadPart) GetRequest() SignedRequest`

GetRequest returns the Request field if non-nil, zero value otherwise.

### GetRequestOk

`func (o *UploadPart) GetRequestOk() (*SignedRequest, bool)`

GetRequestOk returns a tuple with the Request field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRequest

`func (o *UploadPart) SetRequest(v SignedRequest)`

SetRequest sets Request field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


