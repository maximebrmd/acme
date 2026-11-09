# TikTokAccount

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Posting** | [**TikTokAccountPosting**](TikTokAccountPosting.md) |  | 
**TakesPhotos** | **bool** |  | 

## Methods

### NewTikTokAccount

`func NewTikTokAccount(posting TikTokAccountPosting, takesPhotos bool, ) *TikTokAccount`

NewTikTokAccount instantiates a new TikTokAccount object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewTikTokAccountWithDefaults

`func NewTikTokAccountWithDefaults() *TikTokAccount`

NewTikTokAccountWithDefaults instantiates a new TikTokAccount object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetPosting

`func (o *TikTokAccount) GetPosting() TikTokAccountPosting`

GetPosting returns the Posting field if non-nil, zero value otherwise.

### GetPostingOk

`func (o *TikTokAccount) GetPostingOk() (*TikTokAccountPosting, bool)`

GetPostingOk returns a tuple with the Posting field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPosting

`func (o *TikTokAccount) SetPosting(v TikTokAccountPosting)`

SetPosting sets Posting field to given value.


### GetTakesPhotos

`func (o *TikTokAccount) GetTakesPhotos() bool`

GetTakesPhotos returns the TakesPhotos field if non-nil, zero value otherwise.

### GetTakesPhotosOk

`func (o *TikTokAccount) GetTakesPhotosOk() (*bool, bool)`

GetTakesPhotosOk returns a tuple with the TakesPhotos field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTakesPhotos

`func (o *TikTokAccount) SetTakesPhotos(v bool)`

SetTakesPhotos sets TakesPhotos field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


