# DraftPage

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Items** | [**[]Post**](Post.md) |  | 
**NextCursor** | **NullableString** |  | 

## Methods

### NewDraftPage

`func NewDraftPage(items []Post, nextCursor NullableString, ) *DraftPage`

NewDraftPage instantiates a new DraftPage object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewDraftPageWithDefaults

`func NewDraftPageWithDefaults() *DraftPage`

NewDraftPageWithDefaults instantiates a new DraftPage object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetItems

`func (o *DraftPage) GetItems() []Post`

GetItems returns the Items field if non-nil, zero value otherwise.

### GetItemsOk

`func (o *DraftPage) GetItemsOk() (*[]Post, bool)`

GetItemsOk returns a tuple with the Items field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetItems

`func (o *DraftPage) SetItems(v []Post)`

SetItems sets Items field to given value.


### GetNextCursor

`func (o *DraftPage) GetNextCursor() string`

GetNextCursor returns the NextCursor field if non-nil, zero value otherwise.

### GetNextCursorOk

`func (o *DraftPage) GetNextCursorOk() (*string, bool)`

GetNextCursorOk returns a tuple with the NextCursor field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNextCursor

`func (o *DraftPage) SetNextCursor(v string)`

SetNextCursor sets NextCursor field to given value.


### SetNextCursorNil

`func (o *DraftPage) SetNextCursorNil(b bool)`

 SetNextCursorNil sets the value for NextCursor to be an explicit nil

### UnsetNextCursor
`func (o *DraftPage) UnsetNextCursor()`

UnsetNextCursor ensures that no value is present for NextCursor, not even an explicit nil

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


