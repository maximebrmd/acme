# PostDraft

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**ChannelIds** | **[]string** |  | 
**Content** | [**PostContent**](PostContent.md) |  | 
**Options** | Pointer to [**[]ChannelOptions**](ChannelOptions.md) |  | [optional] 

## Methods

### NewPostDraft

`func NewPostDraft(channelIds []string, content PostContent, ) *PostDraft`

NewPostDraft instantiates a new PostDraft object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewPostDraftWithDefaults

`func NewPostDraftWithDefaults() *PostDraft`

NewPostDraftWithDefaults instantiates a new PostDraft object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetChannelIds

`func (o *PostDraft) GetChannelIds() []string`

GetChannelIds returns the ChannelIds field if non-nil, zero value otherwise.

### GetChannelIdsOk

`func (o *PostDraft) GetChannelIdsOk() (*[]string, bool)`

GetChannelIdsOk returns a tuple with the ChannelIds field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetChannelIds

`func (o *PostDraft) SetChannelIds(v []string)`

SetChannelIds sets ChannelIds field to given value.


### GetContent

`func (o *PostDraft) GetContent() PostContent`

GetContent returns the Content field if non-nil, zero value otherwise.

### GetContentOk

`func (o *PostDraft) GetContentOk() (*PostContent, bool)`

GetContentOk returns a tuple with the Content field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContent

`func (o *PostDraft) SetContent(v PostContent)`

SetContent sets Content field to given value.


### GetOptions

`func (o *PostDraft) GetOptions() []ChannelOptions`

GetOptions returns the Options field if non-nil, zero value otherwise.

### GetOptionsOk

`func (o *PostDraft) GetOptionsOk() (*[]ChannelOptions, bool)`

GetOptionsOk returns a tuple with the Options field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetOptions

`func (o *PostDraft) SetOptions(v []ChannelOptions)`

SetOptions sets Options field to given value.

### HasOptions

`func (o *PostDraft) HasOptions() bool`

HasOptions returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


