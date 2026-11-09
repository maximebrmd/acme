# PreparedUpload

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Media** | [**Media**](Media.md) |  | 
**Upload** | [**UploadTarget**](UploadTarget.md) |  | 

## Methods

### NewPreparedUpload

`func NewPreparedUpload(media Media, upload UploadTarget, ) *PreparedUpload`

NewPreparedUpload instantiates a new PreparedUpload object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewPreparedUploadWithDefaults

`func NewPreparedUploadWithDefaults() *PreparedUpload`

NewPreparedUploadWithDefaults instantiates a new PreparedUpload object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetMedia

`func (o *PreparedUpload) GetMedia() Media`

GetMedia returns the Media field if non-nil, zero value otherwise.

### GetMediaOk

`func (o *PreparedUpload) GetMediaOk() (*Media, bool)`

GetMediaOk returns a tuple with the Media field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMedia

`func (o *PreparedUpload) SetMedia(v Media)`

SetMedia sets Media field to given value.


### GetUpload

`func (o *PreparedUpload) GetUpload() UploadTarget`

GetUpload returns the Upload field if non-nil, zero value otherwise.

### GetUploadOk

`func (o *PreparedUpload) GetUploadOk() (*UploadTarget, bool)`

GetUploadOk returns a tuple with the Upload field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetUpload

`func (o *PreparedUpload) SetUpload(v UploadTarget)`

SetUpload sets Upload field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


