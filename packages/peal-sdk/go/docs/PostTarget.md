# PostTarget

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**ChannelId** | **string** |  | 
**FailureReason** | [**NullableFailureReason**](FailureReason.md) |  | 
**Id** | **string** |  | 
**KeptPrivate** | Pointer to **bool** |  | [optional] 
**Options** | [**NullableTargetOptions**](TargetOptions.md) |  | 
**Permalink** | **NullableString** |  | 
**PublishedAt** | **NullableString** |  | 
**Round** | **int32** |  | 
**Status** | [**PostTargetStatus**](PostTargetStatus.md) |  | 
**UnconfirmedReason** | [**NullableUnconfirmedReason**](UnconfirmedReason.md) |  | 

## Methods

### NewPostTarget

`func NewPostTarget(channelId string, failureReason NullableFailureReason, id string, options NullableTargetOptions, permalink NullableString, publishedAt NullableString, round int32, status PostTargetStatus, unconfirmedReason NullableUnconfirmedReason, ) *PostTarget`

NewPostTarget instantiates a new PostTarget object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewPostTargetWithDefaults

`func NewPostTargetWithDefaults() *PostTarget`

NewPostTargetWithDefaults instantiates a new PostTarget object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetChannelId

`func (o *PostTarget) GetChannelId() string`

GetChannelId returns the ChannelId field if non-nil, zero value otherwise.

### GetChannelIdOk

`func (o *PostTarget) GetChannelIdOk() (*string, bool)`

GetChannelIdOk returns a tuple with the ChannelId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetChannelId

`func (o *PostTarget) SetChannelId(v string)`

SetChannelId sets ChannelId field to given value.


### GetFailureReason

`func (o *PostTarget) GetFailureReason() FailureReason`

GetFailureReason returns the FailureReason field if non-nil, zero value otherwise.

### GetFailureReasonOk

`func (o *PostTarget) GetFailureReasonOk() (*FailureReason, bool)`

GetFailureReasonOk returns a tuple with the FailureReason field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFailureReason

`func (o *PostTarget) SetFailureReason(v FailureReason)`

SetFailureReason sets FailureReason field to given value.


### SetFailureReasonNil

`func (o *PostTarget) SetFailureReasonNil(b bool)`

 SetFailureReasonNil sets the value for FailureReason to be an explicit nil

### UnsetFailureReason
`func (o *PostTarget) UnsetFailureReason()`

UnsetFailureReason ensures that no value is present for FailureReason, not even an explicit nil
### GetId

`func (o *PostTarget) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *PostTarget) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *PostTarget) SetId(v string)`

SetId sets Id field to given value.


### GetKeptPrivate

`func (o *PostTarget) GetKeptPrivate() bool`

GetKeptPrivate returns the KeptPrivate field if non-nil, zero value otherwise.

### GetKeptPrivateOk

`func (o *PostTarget) GetKeptPrivateOk() (*bool, bool)`

GetKeptPrivateOk returns a tuple with the KeptPrivate field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetKeptPrivate

`func (o *PostTarget) SetKeptPrivate(v bool)`

SetKeptPrivate sets KeptPrivate field to given value.

### HasKeptPrivate

`func (o *PostTarget) HasKeptPrivate() bool`

HasKeptPrivate returns a boolean if a field has been set.

### GetOptions

`func (o *PostTarget) GetOptions() TargetOptions`

GetOptions returns the Options field if non-nil, zero value otherwise.

### GetOptionsOk

`func (o *PostTarget) GetOptionsOk() (*TargetOptions, bool)`

GetOptionsOk returns a tuple with the Options field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetOptions

`func (o *PostTarget) SetOptions(v TargetOptions)`

SetOptions sets Options field to given value.


### SetOptionsNil

`func (o *PostTarget) SetOptionsNil(b bool)`

 SetOptionsNil sets the value for Options to be an explicit nil

### UnsetOptions
`func (o *PostTarget) UnsetOptions()`

UnsetOptions ensures that no value is present for Options, not even an explicit nil
### GetPermalink

`func (o *PostTarget) GetPermalink() string`

GetPermalink returns the Permalink field if non-nil, zero value otherwise.

### GetPermalinkOk

`func (o *PostTarget) GetPermalinkOk() (*string, bool)`

GetPermalinkOk returns a tuple with the Permalink field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPermalink

`func (o *PostTarget) SetPermalink(v string)`

SetPermalink sets Permalink field to given value.


### SetPermalinkNil

`func (o *PostTarget) SetPermalinkNil(b bool)`

 SetPermalinkNil sets the value for Permalink to be an explicit nil

### UnsetPermalink
`func (o *PostTarget) UnsetPermalink()`

UnsetPermalink ensures that no value is present for Permalink, not even an explicit nil
### GetPublishedAt

`func (o *PostTarget) GetPublishedAt() string`

GetPublishedAt returns the PublishedAt field if non-nil, zero value otherwise.

### GetPublishedAtOk

`func (o *PostTarget) GetPublishedAtOk() (*string, bool)`

GetPublishedAtOk returns a tuple with the PublishedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPublishedAt

`func (o *PostTarget) SetPublishedAt(v string)`

SetPublishedAt sets PublishedAt field to given value.


### SetPublishedAtNil

`func (o *PostTarget) SetPublishedAtNil(b bool)`

 SetPublishedAtNil sets the value for PublishedAt to be an explicit nil

### UnsetPublishedAt
`func (o *PostTarget) UnsetPublishedAt()`

UnsetPublishedAt ensures that no value is present for PublishedAt, not even an explicit nil
### GetRound

`func (o *PostTarget) GetRound() int32`

GetRound returns the Round field if non-nil, zero value otherwise.

### GetRoundOk

`func (o *PostTarget) GetRoundOk() (*int32, bool)`

GetRoundOk returns a tuple with the Round field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRound

`func (o *PostTarget) SetRound(v int32)`

SetRound sets Round field to given value.


### GetStatus

`func (o *PostTarget) GetStatus() PostTargetStatus`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *PostTarget) GetStatusOk() (*PostTargetStatus, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *PostTarget) SetStatus(v PostTargetStatus)`

SetStatus sets Status field to given value.


### GetUnconfirmedReason

`func (o *PostTarget) GetUnconfirmedReason() UnconfirmedReason`

GetUnconfirmedReason returns the UnconfirmedReason field if non-nil, zero value otherwise.

### GetUnconfirmedReasonOk

`func (o *PostTarget) GetUnconfirmedReasonOk() (*UnconfirmedReason, bool)`

GetUnconfirmedReasonOk returns a tuple with the UnconfirmedReason field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetUnconfirmedReason

`func (o *PostTarget) SetUnconfirmedReason(v UnconfirmedReason)`

SetUnconfirmedReason sets UnconfirmedReason field to given value.


### SetUnconfirmedReasonNil

`func (o *PostTarget) SetUnconfirmedReasonNil(b bool)`

 SetUnconfirmedReasonNil sets the value for UnconfirmedReason to be an explicit nil

### UnsetUnconfirmedReason
`func (o *PostTarget) UnsetUnconfirmedReason()`

UnsetUnconfirmedReason ensures that no value is present for UnconfirmedReason, not even an explicit nil

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


