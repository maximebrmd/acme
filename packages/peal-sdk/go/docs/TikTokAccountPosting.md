# TikTokAccountPosting

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Tag** | **string** |  | 
**Creator** | [**TikTokCreator**](TikTokCreator.md) |  | 
**Reason** | [**TikTokBlock**](TikTokBlock.md) |  | 

## Methods

### NewTikTokAccountPosting

`func NewTikTokAccountPosting(tag string, creator TikTokCreator, reason TikTokBlock, ) *TikTokAccountPosting`

NewTikTokAccountPosting instantiates a new TikTokAccountPosting object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewTikTokAccountPostingWithDefaults

`func NewTikTokAccountPostingWithDefaults() *TikTokAccountPosting`

NewTikTokAccountPostingWithDefaults instantiates a new TikTokAccountPosting object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTag

`func (o *TikTokAccountPosting) GetTag() string`

GetTag returns the Tag field if non-nil, zero value otherwise.

### GetTagOk

`func (o *TikTokAccountPosting) GetTagOk() (*string, bool)`

GetTagOk returns a tuple with the Tag field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTag

`func (o *TikTokAccountPosting) SetTag(v string)`

SetTag sets Tag field to given value.


### GetCreator

`func (o *TikTokAccountPosting) GetCreator() TikTokCreator`

GetCreator returns the Creator field if non-nil, zero value otherwise.

### GetCreatorOk

`func (o *TikTokAccountPosting) GetCreatorOk() (*TikTokCreator, bool)`

GetCreatorOk returns a tuple with the Creator field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreator

`func (o *TikTokAccountPosting) SetCreator(v TikTokCreator)`

SetCreator sets Creator field to given value.


### GetReason

`func (o *TikTokAccountPosting) GetReason() TikTokBlock`

GetReason returns the Reason field if non-nil, zero value otherwise.

### GetReasonOk

`func (o *TikTokAccountPosting) GetReasonOk() (*TikTokBlock, bool)`

GetReasonOk returns a tuple with the Reason field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetReason

`func (o *TikTokAccountPosting) SetReason(v TikTokBlock)`

SetReason sets Reason field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


