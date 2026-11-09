# Post

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**AuthorId** | **NullableString** |  | 
**Content** | [**PostContent**](PostContent.md) |  | 
**Id** | **string** |  | 
**Outcome** | [**NullablePostOutcome**](PostOutcome.md) |  | 
**Schedule** | [**NullablePostSchedule**](PostSchedule.md) |  | 
**Status** | [**PostStatus**](PostStatus.md) |  | 
**Targets** | [**[]PostTarget**](PostTarget.md) |  | 

## Methods

### NewPost

`func NewPost(authorId NullableString, content PostContent, id string, outcome NullablePostOutcome, schedule NullablePostSchedule, status PostStatus, targets []PostTarget, ) *Post`

NewPost instantiates a new Post object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewPostWithDefaults

`func NewPostWithDefaults() *Post`

NewPostWithDefaults instantiates a new Post object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetAuthorId

`func (o *Post) GetAuthorId() string`

GetAuthorId returns the AuthorId field if non-nil, zero value otherwise.

### GetAuthorIdOk

`func (o *Post) GetAuthorIdOk() (*string, bool)`

GetAuthorIdOk returns a tuple with the AuthorId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAuthorId

`func (o *Post) SetAuthorId(v string)`

SetAuthorId sets AuthorId field to given value.


### SetAuthorIdNil

`func (o *Post) SetAuthorIdNil(b bool)`

 SetAuthorIdNil sets the value for AuthorId to be an explicit nil

### UnsetAuthorId
`func (o *Post) UnsetAuthorId()`

UnsetAuthorId ensures that no value is present for AuthorId, not even an explicit nil
### GetContent

`func (o *Post) GetContent() PostContent`

GetContent returns the Content field if non-nil, zero value otherwise.

### GetContentOk

`func (o *Post) GetContentOk() (*PostContent, bool)`

GetContentOk returns a tuple with the Content field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContent

`func (o *Post) SetContent(v PostContent)`

SetContent sets Content field to given value.


### GetId

`func (o *Post) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *Post) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *Post) SetId(v string)`

SetId sets Id field to given value.


### GetOutcome

`func (o *Post) GetOutcome() PostOutcome`

GetOutcome returns the Outcome field if non-nil, zero value otherwise.

### GetOutcomeOk

`func (o *Post) GetOutcomeOk() (*PostOutcome, bool)`

GetOutcomeOk returns a tuple with the Outcome field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetOutcome

`func (o *Post) SetOutcome(v PostOutcome)`

SetOutcome sets Outcome field to given value.


### SetOutcomeNil

`func (o *Post) SetOutcomeNil(b bool)`

 SetOutcomeNil sets the value for Outcome to be an explicit nil

### UnsetOutcome
`func (o *Post) UnsetOutcome()`

UnsetOutcome ensures that no value is present for Outcome, not even an explicit nil
### GetSchedule

`func (o *Post) GetSchedule() PostSchedule`

GetSchedule returns the Schedule field if non-nil, zero value otherwise.

### GetScheduleOk

`func (o *Post) GetScheduleOk() (*PostSchedule, bool)`

GetScheduleOk returns a tuple with the Schedule field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSchedule

`func (o *Post) SetSchedule(v PostSchedule)`

SetSchedule sets Schedule field to given value.


### SetScheduleNil

`func (o *Post) SetScheduleNil(b bool)`

 SetScheduleNil sets the value for Schedule to be an explicit nil

### UnsetSchedule
`func (o *Post) UnsetSchedule()`

UnsetSchedule ensures that no value is present for Schedule, not even an explicit nil
### GetStatus

`func (o *Post) GetStatus() PostStatus`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *Post) GetStatusOk() (*PostStatus, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *Post) SetStatus(v PostStatus)`

SetStatus sets Status field to given value.


### GetTargets

`func (o *Post) GetTargets() []PostTarget`

GetTargets returns the Targets field if non-nil, zero value otherwise.

### GetTargetsOk

`func (o *Post) GetTargetsOk() (*[]PostTarget, bool)`

GetTargetsOk returns a tuple with the Targets field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTargets

`func (o *Post) SetTargets(v []PostTarget)`

SetTargets sets Targets field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


