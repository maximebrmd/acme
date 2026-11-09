# UploadTarget

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Tag** | **string** |  | 
**ExpiresAt** | **string** |  | 
**Request** | [**SignedRequest**](SignedRequest.md) |  | 
**PartSize** | **int32** |  | 
**Parts** | [**[]UploadPart**](UploadPart.md) |  | 

## Methods

### NewUploadTarget

`func NewUploadTarget(tag string, expiresAt string, request SignedRequest, partSize int32, parts []UploadPart, ) *UploadTarget`

NewUploadTarget instantiates a new UploadTarget object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewUploadTargetWithDefaults

`func NewUploadTargetWithDefaults() *UploadTarget`

NewUploadTargetWithDefaults instantiates a new UploadTarget object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTag

`func (o *UploadTarget) GetTag() string`

GetTag returns the Tag field if non-nil, zero value otherwise.

### GetTagOk

`func (o *UploadTarget) GetTagOk() (*string, bool)`

GetTagOk returns a tuple with the Tag field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTag

`func (o *UploadTarget) SetTag(v string)`

SetTag sets Tag field to given value.


### GetExpiresAt

`func (o *UploadTarget) GetExpiresAt() string`

GetExpiresAt returns the ExpiresAt field if non-nil, zero value otherwise.

### GetExpiresAtOk

`func (o *UploadTarget) GetExpiresAtOk() (*string, bool)`

GetExpiresAtOk returns a tuple with the ExpiresAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetExpiresAt

`func (o *UploadTarget) SetExpiresAt(v string)`

SetExpiresAt sets ExpiresAt field to given value.


### GetRequest

`func (o *UploadTarget) GetRequest() SignedRequest`

GetRequest returns the Request field if non-nil, zero value otherwise.

### GetRequestOk

`func (o *UploadTarget) GetRequestOk() (*SignedRequest, bool)`

GetRequestOk returns a tuple with the Request field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRequest

`func (o *UploadTarget) SetRequest(v SignedRequest)`

SetRequest sets Request field to given value.


### GetPartSize

`func (o *UploadTarget) GetPartSize() int32`

GetPartSize returns the PartSize field if non-nil, zero value otherwise.

### GetPartSizeOk

`func (o *UploadTarget) GetPartSizeOk() (*int32, bool)`

GetPartSizeOk returns a tuple with the PartSize field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPartSize

`func (o *UploadTarget) SetPartSize(v int32)`

SetPartSize sets PartSize field to given value.


### GetParts

`func (o *UploadTarget) GetParts() []UploadPart`

GetParts returns the Parts field if non-nil, zero value otherwise.

### GetPartsOk

`func (o *UploadTarget) GetPartsOk() (*[]UploadPart, bool)`

GetPartsOk returns a tuple with the Parts field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetParts

`func (o *UploadTarget) SetParts(v []UploadPart)`

SetParts sets Parts field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


