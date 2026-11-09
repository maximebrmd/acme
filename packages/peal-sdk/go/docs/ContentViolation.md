# ContentViolation

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Tag** | **string** |  | 
**ChannelId** | **string** |  | 
**Platform** | [**Platform**](Platform.md) |  | 
**OptionsPlatform** | [**Platform**](Platform.md) |  | 
**Field** | **string** |  | 
**Length** | **int32** |  | 
**Maximum** | **int32** |  | 
**Unit** | [**TextUnit**](TextUnit.md) |  | 
**Characters** | **[]string** |  | 
**Count** | **int32** |  | 
**MediaId** | **string** |  | 
**ContentType** | [**MediaContentType**](MediaContentType.md) |  | 
**ByteSize** | **int32** |  | 
**Minimum** | [**ContentViolationAnyOf24Maximum**](ContentViolationAnyOf24Maximum.md) |  | 
**DurationMs** | **int32** |  | 
**MaximumMs** | **int32** |  | 
**MinimumMs** | **int32** |  | 
**Height** | **int32** |  | 
**Width** | **int32** |  | 

## Methods

### NewContentViolation

`func NewContentViolation(tag string, channelId string, platform Platform, optionsPlatform Platform, field string, length int32, maximum int32, unit TextUnit, characters []string, count int32, mediaId string, contentType MediaContentType, byteSize int32, minimum ContentViolationAnyOf24Maximum, durationMs int32, maximumMs int32, minimumMs int32, height int32, width int32, ) *ContentViolation`

NewContentViolation instantiates a new ContentViolation object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewContentViolationWithDefaults

`func NewContentViolationWithDefaults() *ContentViolation`

NewContentViolationWithDefaults instantiates a new ContentViolation object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTag

`func (o *ContentViolation) GetTag() string`

GetTag returns the Tag field if non-nil, zero value otherwise.

### GetTagOk

`func (o *ContentViolation) GetTagOk() (*string, bool)`

GetTagOk returns a tuple with the Tag field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTag

`func (o *ContentViolation) SetTag(v string)`

SetTag sets Tag field to given value.


### GetChannelId

`func (o *ContentViolation) GetChannelId() string`

GetChannelId returns the ChannelId field if non-nil, zero value otherwise.

### GetChannelIdOk

`func (o *ContentViolation) GetChannelIdOk() (*string, bool)`

GetChannelIdOk returns a tuple with the ChannelId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetChannelId

`func (o *ContentViolation) SetChannelId(v string)`

SetChannelId sets ChannelId field to given value.


### GetPlatform

`func (o *ContentViolation) GetPlatform() Platform`

GetPlatform returns the Platform field if non-nil, zero value otherwise.

### GetPlatformOk

`func (o *ContentViolation) GetPlatformOk() (*Platform, bool)`

GetPlatformOk returns a tuple with the Platform field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPlatform

`func (o *ContentViolation) SetPlatform(v Platform)`

SetPlatform sets Platform field to given value.


### GetOptionsPlatform

`func (o *ContentViolation) GetOptionsPlatform() Platform`

GetOptionsPlatform returns the OptionsPlatform field if non-nil, zero value otherwise.

### GetOptionsPlatformOk

`func (o *ContentViolation) GetOptionsPlatformOk() (*Platform, bool)`

GetOptionsPlatformOk returns a tuple with the OptionsPlatform field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetOptionsPlatform

`func (o *ContentViolation) SetOptionsPlatform(v Platform)`

SetOptionsPlatform sets OptionsPlatform field to given value.


### GetField

`func (o *ContentViolation) GetField() string`

GetField returns the Field field if non-nil, zero value otherwise.

### GetFieldOk

`func (o *ContentViolation) GetFieldOk() (*string, bool)`

GetFieldOk returns a tuple with the Field field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetField

`func (o *ContentViolation) SetField(v string)`

SetField sets Field field to given value.


### GetLength

`func (o *ContentViolation) GetLength() int32`

GetLength returns the Length field if non-nil, zero value otherwise.

### GetLengthOk

`func (o *ContentViolation) GetLengthOk() (*int32, bool)`

GetLengthOk returns a tuple with the Length field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLength

`func (o *ContentViolation) SetLength(v int32)`

SetLength sets Length field to given value.


### GetMaximum

`func (o *ContentViolation) GetMaximum() int32`

GetMaximum returns the Maximum field if non-nil, zero value otherwise.

### GetMaximumOk

`func (o *ContentViolation) GetMaximumOk() (*int32, bool)`

GetMaximumOk returns a tuple with the Maximum field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMaximum

`func (o *ContentViolation) SetMaximum(v int32)`

SetMaximum sets Maximum field to given value.


### GetUnit

`func (o *ContentViolation) GetUnit() TextUnit`

GetUnit returns the Unit field if non-nil, zero value otherwise.

### GetUnitOk

`func (o *ContentViolation) GetUnitOk() (*TextUnit, bool)`

GetUnitOk returns a tuple with the Unit field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetUnit

`func (o *ContentViolation) SetUnit(v TextUnit)`

SetUnit sets Unit field to given value.


### GetCharacters

`func (o *ContentViolation) GetCharacters() []string`

GetCharacters returns the Characters field if non-nil, zero value otherwise.

### GetCharactersOk

`func (o *ContentViolation) GetCharactersOk() (*[]string, bool)`

GetCharactersOk returns a tuple with the Characters field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCharacters

`func (o *ContentViolation) SetCharacters(v []string)`

SetCharacters sets Characters field to given value.


### GetCount

`func (o *ContentViolation) GetCount() int32`

GetCount returns the Count field if non-nil, zero value otherwise.

### GetCountOk

`func (o *ContentViolation) GetCountOk() (*int32, bool)`

GetCountOk returns a tuple with the Count field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCount

`func (o *ContentViolation) SetCount(v int32)`

SetCount sets Count field to given value.


### GetMediaId

`func (o *ContentViolation) GetMediaId() string`

GetMediaId returns the MediaId field if non-nil, zero value otherwise.

### GetMediaIdOk

`func (o *ContentViolation) GetMediaIdOk() (*string, bool)`

GetMediaIdOk returns a tuple with the MediaId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMediaId

`func (o *ContentViolation) SetMediaId(v string)`

SetMediaId sets MediaId field to given value.


### GetContentType

`func (o *ContentViolation) GetContentType() MediaContentType`

GetContentType returns the ContentType field if non-nil, zero value otherwise.

### GetContentTypeOk

`func (o *ContentViolation) GetContentTypeOk() (*MediaContentType, bool)`

GetContentTypeOk returns a tuple with the ContentType field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContentType

`func (o *ContentViolation) SetContentType(v MediaContentType)`

SetContentType sets ContentType field to given value.


### GetByteSize

`func (o *ContentViolation) GetByteSize() int32`

GetByteSize returns the ByteSize field if non-nil, zero value otherwise.

### GetByteSizeOk

`func (o *ContentViolation) GetByteSizeOk() (*int32, bool)`

GetByteSizeOk returns a tuple with the ByteSize field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetByteSize

`func (o *ContentViolation) SetByteSize(v int32)`

SetByteSize sets ByteSize field to given value.


### GetMinimum

`func (o *ContentViolation) GetMinimum() ContentViolationAnyOf24Maximum`

GetMinimum returns the Minimum field if non-nil, zero value otherwise.

### GetMinimumOk

`func (o *ContentViolation) GetMinimumOk() (*ContentViolationAnyOf24Maximum, bool)`

GetMinimumOk returns a tuple with the Minimum field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMinimum

`func (o *ContentViolation) SetMinimum(v ContentViolationAnyOf24Maximum)`

SetMinimum sets Minimum field to given value.


### GetDurationMs

`func (o *ContentViolation) GetDurationMs() int32`

GetDurationMs returns the DurationMs field if non-nil, zero value otherwise.

### GetDurationMsOk

`func (o *ContentViolation) GetDurationMsOk() (*int32, bool)`

GetDurationMsOk returns a tuple with the DurationMs field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDurationMs

`func (o *ContentViolation) SetDurationMs(v int32)`

SetDurationMs sets DurationMs field to given value.


### GetMaximumMs

`func (o *ContentViolation) GetMaximumMs() int32`

GetMaximumMs returns the MaximumMs field if non-nil, zero value otherwise.

### GetMaximumMsOk

`func (o *ContentViolation) GetMaximumMsOk() (*int32, bool)`

GetMaximumMsOk returns a tuple with the MaximumMs field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMaximumMs

`func (o *ContentViolation) SetMaximumMs(v int32)`

SetMaximumMs sets MaximumMs field to given value.


### GetMinimumMs

`func (o *ContentViolation) GetMinimumMs() int32`

GetMinimumMs returns the MinimumMs field if non-nil, zero value otherwise.

### GetMinimumMsOk

`func (o *ContentViolation) GetMinimumMsOk() (*int32, bool)`

GetMinimumMsOk returns a tuple with the MinimumMs field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMinimumMs

`func (o *ContentViolation) SetMinimumMs(v int32)`

SetMinimumMs sets MinimumMs field to given value.


### GetHeight

`func (o *ContentViolation) GetHeight() int32`

GetHeight returns the Height field if non-nil, zero value otherwise.

### GetHeightOk

`func (o *ContentViolation) GetHeightOk() (*int32, bool)`

GetHeightOk returns a tuple with the Height field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetHeight

`func (o *ContentViolation) SetHeight(v int32)`

SetHeight sets Height field to given value.


### GetWidth

`func (o *ContentViolation) GetWidth() int32`

GetWidth returns the Width field if non-nil, zero value otherwise.

### GetWidthOk

`func (o *ContentViolation) GetWidthOk() (*int32, bool)`

GetWidthOk returns a tuple with the Width field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetWidth

`func (o *ContentViolation) SetWidth(v int32)`

SetWidth sets Width field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


