# PostsCreate422Response

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Tag** | **string** |  | 
**Violations** | [**[]ContentViolation**](ContentViolation.md) |  | 
**ChannelIds** | **[]string** |  | 
**MediaIds** | **[]string** |  | 

## Methods

### NewPostsCreate422Response

`func NewPostsCreate422Response(tag string, violations []ContentViolation, channelIds []string, mediaIds []string, ) *PostsCreate422Response`

NewPostsCreate422Response instantiates a new PostsCreate422Response object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewPostsCreate422ResponseWithDefaults

`func NewPostsCreate422ResponseWithDefaults() *PostsCreate422Response`

NewPostsCreate422ResponseWithDefaults instantiates a new PostsCreate422Response object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTag

`func (o *PostsCreate422Response) GetTag() string`

GetTag returns the Tag field if non-nil, zero value otherwise.

### GetTagOk

`func (o *PostsCreate422Response) GetTagOk() (*string, bool)`

GetTagOk returns a tuple with the Tag field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTag

`func (o *PostsCreate422Response) SetTag(v string)`

SetTag sets Tag field to given value.


### GetViolations

`func (o *PostsCreate422Response) GetViolations() []ContentViolation`

GetViolations returns the Violations field if non-nil, zero value otherwise.

### GetViolationsOk

`func (o *PostsCreate422Response) GetViolationsOk() (*[]ContentViolation, bool)`

GetViolationsOk returns a tuple with the Violations field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetViolations

`func (o *PostsCreate422Response) SetViolations(v []ContentViolation)`

SetViolations sets Violations field to given value.


### GetChannelIds

`func (o *PostsCreate422Response) GetChannelIds() []string`

GetChannelIds returns the ChannelIds field if non-nil, zero value otherwise.

### GetChannelIdsOk

`func (o *PostsCreate422Response) GetChannelIdsOk() (*[]string, bool)`

GetChannelIdsOk returns a tuple with the ChannelIds field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetChannelIds

`func (o *PostsCreate422Response) SetChannelIds(v []string)`

SetChannelIds sets ChannelIds field to given value.


### GetMediaIds

`func (o *PostsCreate422Response) GetMediaIds() []string`

GetMediaIds returns the MediaIds field if non-nil, zero value otherwise.

### GetMediaIdsOk

`func (o *PostsCreate422Response) GetMediaIdsOk() (*[]string, bool)`

GetMediaIdsOk returns a tuple with the MediaIds field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMediaIds

`func (o *PostsCreate422Response) SetMediaIds(v []string)`

SetMediaIds sets MediaIds field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


