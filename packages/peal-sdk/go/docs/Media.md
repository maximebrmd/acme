# Media

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**AltText** | **NullableString** |  | 
**ByteSize** | **int32** |  | 
**Codec** | **NullableString** |  | 
**ContentType** | [**MediaContentType**](MediaContentType.md) |  | 
**CreatedAt** | **string** |  | 
**Dimensions** | [**NullableMediaDimensions**](MediaDimensions.md) |  | 
**DurationMs** | **NullableInt32** |  | 
**Id** | **string** |  | 
**Kind** | [**MediaKind**](MediaKind.md) |  | 
**Status** | [**MediaStatus**](MediaStatus.md) |  | 
**UpdatedAt** | **string** |  | 
**Url** | **NullableString** |  | 

## Methods

### NewMedia

`func NewMedia(altText NullableString, byteSize int32, codec NullableString, contentType MediaContentType, createdAt string, dimensions NullableMediaDimensions, durationMs NullableInt32, id string, kind MediaKind, status MediaStatus, updatedAt string, url NullableString, ) *Media`

NewMedia instantiates a new Media object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewMediaWithDefaults

`func NewMediaWithDefaults() *Media`

NewMediaWithDefaults instantiates a new Media object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetAltText

`func (o *Media) GetAltText() string`

GetAltText returns the AltText field if non-nil, zero value otherwise.

### GetAltTextOk

`func (o *Media) GetAltTextOk() (*string, bool)`

GetAltTextOk returns a tuple with the AltText field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAltText

`func (o *Media) SetAltText(v string)`

SetAltText sets AltText field to given value.


### SetAltTextNil

`func (o *Media) SetAltTextNil(b bool)`

 SetAltTextNil sets the value for AltText to be an explicit nil

### UnsetAltText
`func (o *Media) UnsetAltText()`

UnsetAltText ensures that no value is present for AltText, not even an explicit nil
### GetByteSize

`func (o *Media) GetByteSize() int32`

GetByteSize returns the ByteSize field if non-nil, zero value otherwise.

### GetByteSizeOk

`func (o *Media) GetByteSizeOk() (*int32, bool)`

GetByteSizeOk returns a tuple with the ByteSize field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetByteSize

`func (o *Media) SetByteSize(v int32)`

SetByteSize sets ByteSize field to given value.


### GetCodec

`func (o *Media) GetCodec() string`

GetCodec returns the Codec field if non-nil, zero value otherwise.

### GetCodecOk

`func (o *Media) GetCodecOk() (*string, bool)`

GetCodecOk returns a tuple with the Codec field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCodec

`func (o *Media) SetCodec(v string)`

SetCodec sets Codec field to given value.


### SetCodecNil

`func (o *Media) SetCodecNil(b bool)`

 SetCodecNil sets the value for Codec to be an explicit nil

### UnsetCodec
`func (o *Media) UnsetCodec()`

UnsetCodec ensures that no value is present for Codec, not even an explicit nil
### GetContentType

`func (o *Media) GetContentType() MediaContentType`

GetContentType returns the ContentType field if non-nil, zero value otherwise.

### GetContentTypeOk

`func (o *Media) GetContentTypeOk() (*MediaContentType, bool)`

GetContentTypeOk returns a tuple with the ContentType field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContentType

`func (o *Media) SetContentType(v MediaContentType)`

SetContentType sets ContentType field to given value.


### GetCreatedAt

`func (o *Media) GetCreatedAt() string`

GetCreatedAt returns the CreatedAt field if non-nil, zero value otherwise.

### GetCreatedAtOk

`func (o *Media) GetCreatedAtOk() (*string, bool)`

GetCreatedAtOk returns a tuple with the CreatedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreatedAt

`func (o *Media) SetCreatedAt(v string)`

SetCreatedAt sets CreatedAt field to given value.


### GetDimensions

`func (o *Media) GetDimensions() MediaDimensions`

GetDimensions returns the Dimensions field if non-nil, zero value otherwise.

### GetDimensionsOk

`func (o *Media) GetDimensionsOk() (*MediaDimensions, bool)`

GetDimensionsOk returns a tuple with the Dimensions field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDimensions

`func (o *Media) SetDimensions(v MediaDimensions)`

SetDimensions sets Dimensions field to given value.


### SetDimensionsNil

`func (o *Media) SetDimensionsNil(b bool)`

 SetDimensionsNil sets the value for Dimensions to be an explicit nil

### UnsetDimensions
`func (o *Media) UnsetDimensions()`

UnsetDimensions ensures that no value is present for Dimensions, not even an explicit nil
### GetDurationMs

`func (o *Media) GetDurationMs() int32`

GetDurationMs returns the DurationMs field if non-nil, zero value otherwise.

### GetDurationMsOk

`func (o *Media) GetDurationMsOk() (*int32, bool)`

GetDurationMsOk returns a tuple with the DurationMs field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDurationMs

`func (o *Media) SetDurationMs(v int32)`

SetDurationMs sets DurationMs field to given value.


### SetDurationMsNil

`func (o *Media) SetDurationMsNil(b bool)`

 SetDurationMsNil sets the value for DurationMs to be an explicit nil

### UnsetDurationMs
`func (o *Media) UnsetDurationMs()`

UnsetDurationMs ensures that no value is present for DurationMs, not even an explicit nil
### GetId

`func (o *Media) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *Media) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *Media) SetId(v string)`

SetId sets Id field to given value.


### GetKind

`func (o *Media) GetKind() MediaKind`

GetKind returns the Kind field if non-nil, zero value otherwise.

### GetKindOk

`func (o *Media) GetKindOk() (*MediaKind, bool)`

GetKindOk returns a tuple with the Kind field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetKind

`func (o *Media) SetKind(v MediaKind)`

SetKind sets Kind field to given value.


### GetStatus

`func (o *Media) GetStatus() MediaStatus`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *Media) GetStatusOk() (*MediaStatus, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *Media) SetStatus(v MediaStatus)`

SetStatus sets Status field to given value.


### GetUpdatedAt

`func (o *Media) GetUpdatedAt() string`

GetUpdatedAt returns the UpdatedAt field if non-nil, zero value otherwise.

### GetUpdatedAtOk

`func (o *Media) GetUpdatedAtOk() (*string, bool)`

GetUpdatedAtOk returns a tuple with the UpdatedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetUpdatedAt

`func (o *Media) SetUpdatedAt(v string)`

SetUpdatedAt sets UpdatedAt field to given value.


### GetUrl

`func (o *Media) GetUrl() string`

GetUrl returns the Url field if non-nil, zero value otherwise.

### GetUrlOk

`func (o *Media) GetUrlOk() (*string, bool)`

GetUrlOk returns a tuple with the Url field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetUrl

`func (o *Media) SetUrl(v string)`

SetUrl sets Url field to given value.


### SetUrlNil

`func (o *Media) SetUrlNil(b bool)`

 SetUrlNil sets the value for Url to be an explicit nil

### UnsetUrl
`func (o *Media) UnsetUrl()`

UnsetUrl ensures that no value is present for Url, not even an explicit nil

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


