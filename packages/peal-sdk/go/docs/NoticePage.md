# NoticePage

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Items** | [**[]Notice**](Notice.md) |  | 
**NextCursor** | **NullableString** |  | 

## Methods

### NewNoticePage

`func NewNoticePage(items []Notice, nextCursor NullableString, ) *NoticePage`

NewNoticePage instantiates a new NoticePage object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewNoticePageWithDefaults

`func NewNoticePageWithDefaults() *NoticePage`

NewNoticePageWithDefaults instantiates a new NoticePage object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetItems

`func (o *NoticePage) GetItems() []Notice`

GetItems returns the Items field if non-nil, zero value otherwise.

### GetItemsOk

`func (o *NoticePage) GetItemsOk() (*[]Notice, bool)`

GetItemsOk returns a tuple with the Items field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetItems

`func (o *NoticePage) SetItems(v []Notice)`

SetItems sets Items field to given value.


### GetNextCursor

`func (o *NoticePage) GetNextCursor() string`

GetNextCursor returns the NextCursor field if non-nil, zero value otherwise.

### GetNextCursorOk

`func (o *NoticePage) GetNextCursorOk() (*string, bool)`

GetNextCursorOk returns a tuple with the NextCursor field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNextCursor

`func (o *NoticePage) SetNextCursor(v string)`

SetNextCursor sets NextCursor field to given value.


### SetNextCursorNil

`func (o *NoticePage) SetNextCursorNil(b bool)`

 SetNextCursorNil sets the value for NextCursor to be an explicit nil

### UnsetNextCursor
`func (o *NoticePage) UnsetNextCursor()`

UnsetNextCursor ensures that no value is present for NextCursor, not even an explicit nil

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


