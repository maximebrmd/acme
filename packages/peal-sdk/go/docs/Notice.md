# Notice

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**CreatedAt** | **string** |  | 
**Event** | [**NoticeEvent**](NoticeEvent.md) |  | 
**Id** | **string** |  | 
**ReadAt** | **NullableString** |  | 
**WorkspaceId** | **string** |  | 

## Methods

### NewNotice

`func NewNotice(createdAt string, event NoticeEvent, id string, readAt NullableString, workspaceId string, ) *Notice`

NewNotice instantiates a new Notice object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewNoticeWithDefaults

`func NewNoticeWithDefaults() *Notice`

NewNoticeWithDefaults instantiates a new Notice object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetCreatedAt

`func (o *Notice) GetCreatedAt() string`

GetCreatedAt returns the CreatedAt field if non-nil, zero value otherwise.

### GetCreatedAtOk

`func (o *Notice) GetCreatedAtOk() (*string, bool)`

GetCreatedAtOk returns a tuple with the CreatedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreatedAt

`func (o *Notice) SetCreatedAt(v string)`

SetCreatedAt sets CreatedAt field to given value.


### GetEvent

`func (o *Notice) GetEvent() NoticeEvent`

GetEvent returns the Event field if non-nil, zero value otherwise.

### GetEventOk

`func (o *Notice) GetEventOk() (*NoticeEvent, bool)`

GetEventOk returns a tuple with the Event field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEvent

`func (o *Notice) SetEvent(v NoticeEvent)`

SetEvent sets Event field to given value.


### GetId

`func (o *Notice) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *Notice) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *Notice) SetId(v string)`

SetId sets Id field to given value.


### GetReadAt

`func (o *Notice) GetReadAt() string`

GetReadAt returns the ReadAt field if non-nil, zero value otherwise.

### GetReadAtOk

`func (o *Notice) GetReadAtOk() (*string, bool)`

GetReadAtOk returns a tuple with the ReadAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetReadAt

`func (o *Notice) SetReadAt(v string)`

SetReadAt sets ReadAt field to given value.


### SetReadAtNil

`func (o *Notice) SetReadAtNil(b bool)`

 SetReadAtNil sets the value for ReadAt to be an explicit nil

### UnsetReadAt
`func (o *Notice) UnsetReadAt()`

UnsetReadAt ensures that no value is present for ReadAt, not even an explicit nil
### GetWorkspaceId

`func (o *Notice) GetWorkspaceId() string`

GetWorkspaceId returns the WorkspaceId field if non-nil, zero value otherwise.

### GetWorkspaceIdOk

`func (o *Notice) GetWorkspaceIdOk() (*string, bool)`

GetWorkspaceIdOk returns a tuple with the WorkspaceId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetWorkspaceId

`func (o *Notice) SetWorkspaceId(v string)`

SetWorkspaceId sets WorkspaceId field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


