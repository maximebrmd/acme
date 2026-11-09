# NewUpload

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**AltText** | Pointer to **NullableString** |  | [optional] 
**ByteSize** | **int32** |  | 
**ContentType** | **string** |  | 

## Methods

### NewNewUpload

`func NewNewUpload(byteSize int32, contentType string, ) *NewUpload`

NewNewUpload instantiates a new NewUpload object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewNewUploadWithDefaults

`func NewNewUploadWithDefaults() *NewUpload`

NewNewUploadWithDefaults instantiates a new NewUpload object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetAltText

`func (o *NewUpload) GetAltText() string`

GetAltText returns the AltText field if non-nil, zero value otherwise.

### GetAltTextOk

`func (o *NewUpload) GetAltTextOk() (*string, bool)`

GetAltTextOk returns a tuple with the AltText field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAltText

`func (o *NewUpload) SetAltText(v string)`

SetAltText sets AltText field to given value.

### HasAltText

`func (o *NewUpload) HasAltText() bool`

HasAltText returns a boolean if a field has been set.

### SetAltTextNil

`func (o *NewUpload) SetAltTextNil(b bool)`

 SetAltTextNil sets the value for AltText to be an explicit nil

### UnsetAltText
`func (o *NewUpload) UnsetAltText()`

UnsetAltText ensures that no value is present for AltText, not even an explicit nil
### GetByteSize

`func (o *NewUpload) GetByteSize() int32`

GetByteSize returns the ByteSize field if non-nil, zero value otherwise.

### GetByteSizeOk

`func (o *NewUpload) GetByteSizeOk() (*int32, bool)`

GetByteSizeOk returns a tuple with the ByteSize field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetByteSize

`func (o *NewUpload) SetByteSize(v int32)`

SetByteSize sets ByteSize field to given value.


### GetContentType

`func (o *NewUpload) GetContentType() string`

GetContentType returns the ContentType field if non-nil, zero value otherwise.

### GetContentTypeOk

`func (o *NewUpload) GetContentTypeOk() (*string, bool)`

GetContentTypeOk returns a tuple with the ContentType field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContentType

`func (o *NewUpload) SetContentType(v string)`

SetContentType sets ContentType field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


