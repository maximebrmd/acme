# NoticeEvent

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Tag** | **string** |  | 
**Channel** | [**NoticeChannel**](NoticeChannel.md) |  | 
**Permalink** | **NullableString** |  | 
**PostId** | **string** |  | 
**Reason** | [**FailureReason**](FailureReason.md) |  | 
**ExpiresAt** | **string** |  | 
**Interval** | [**BillingInterval**](BillingInterval.md) |  | 
**Plan** | [**PaidPlan**](PaidPlan.md) |  | 
**Price** | [**Money**](Money.md) |  | 
**StartedAt** | **string** |  | 
**TrialEnd** | **NullableString** |  | 
**EndsAt** | **string** |  | 
**RenewsAt** | **string** |  | 
**Refunded** | [**Money**](Money.md) |  | 
**WithdrawnAt** | **string** |  | 

## Methods

### NewNoticeEvent

`func NewNoticeEvent(tag string, channel NoticeChannel, permalink NullableString, postId string, reason FailureReason, expiresAt string, interval BillingInterval, plan PaidPlan, price Money, startedAt string, trialEnd NullableString, endsAt string, renewsAt string, refunded Money, withdrawnAt string, ) *NoticeEvent`

NewNoticeEvent instantiates a new NoticeEvent object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewNoticeEventWithDefaults

`func NewNoticeEventWithDefaults() *NoticeEvent`

NewNoticeEventWithDefaults instantiates a new NoticeEvent object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTag

`func (o *NoticeEvent) GetTag() string`

GetTag returns the Tag field if non-nil, zero value otherwise.

### GetTagOk

`func (o *NoticeEvent) GetTagOk() (*string, bool)`

GetTagOk returns a tuple with the Tag field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTag

`func (o *NoticeEvent) SetTag(v string)`

SetTag sets Tag field to given value.


### GetChannel

`func (o *NoticeEvent) GetChannel() NoticeChannel`

GetChannel returns the Channel field if non-nil, zero value otherwise.

### GetChannelOk

`func (o *NoticeEvent) GetChannelOk() (*NoticeChannel, bool)`

GetChannelOk returns a tuple with the Channel field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetChannel

`func (o *NoticeEvent) SetChannel(v NoticeChannel)`

SetChannel sets Channel field to given value.


### GetPermalink

`func (o *NoticeEvent) GetPermalink() string`

GetPermalink returns the Permalink field if non-nil, zero value otherwise.

### GetPermalinkOk

`func (o *NoticeEvent) GetPermalinkOk() (*string, bool)`

GetPermalinkOk returns a tuple with the Permalink field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPermalink

`func (o *NoticeEvent) SetPermalink(v string)`

SetPermalink sets Permalink field to given value.


### SetPermalinkNil

`func (o *NoticeEvent) SetPermalinkNil(b bool)`

 SetPermalinkNil sets the value for Permalink to be an explicit nil

### UnsetPermalink
`func (o *NoticeEvent) UnsetPermalink()`

UnsetPermalink ensures that no value is present for Permalink, not even an explicit nil
### GetPostId

`func (o *NoticeEvent) GetPostId() string`

GetPostId returns the PostId field if non-nil, zero value otherwise.

### GetPostIdOk

`func (o *NoticeEvent) GetPostIdOk() (*string, bool)`

GetPostIdOk returns a tuple with the PostId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPostId

`func (o *NoticeEvent) SetPostId(v string)`

SetPostId sets PostId field to given value.


### GetReason

`func (o *NoticeEvent) GetReason() FailureReason`

GetReason returns the Reason field if non-nil, zero value otherwise.

### GetReasonOk

`func (o *NoticeEvent) GetReasonOk() (*FailureReason, bool)`

GetReasonOk returns a tuple with the Reason field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetReason

`func (o *NoticeEvent) SetReason(v FailureReason)`

SetReason sets Reason field to given value.


### GetExpiresAt

`func (o *NoticeEvent) GetExpiresAt() string`

GetExpiresAt returns the ExpiresAt field if non-nil, zero value otherwise.

### GetExpiresAtOk

`func (o *NoticeEvent) GetExpiresAtOk() (*string, bool)`

GetExpiresAtOk returns a tuple with the ExpiresAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetExpiresAt

`func (o *NoticeEvent) SetExpiresAt(v string)`

SetExpiresAt sets ExpiresAt field to given value.


### GetInterval

`func (o *NoticeEvent) GetInterval() BillingInterval`

GetInterval returns the Interval field if non-nil, zero value otherwise.

### GetIntervalOk

`func (o *NoticeEvent) GetIntervalOk() (*BillingInterval, bool)`

GetIntervalOk returns a tuple with the Interval field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetInterval

`func (o *NoticeEvent) SetInterval(v BillingInterval)`

SetInterval sets Interval field to given value.


### GetPlan

`func (o *NoticeEvent) GetPlan() PaidPlan`

GetPlan returns the Plan field if non-nil, zero value otherwise.

### GetPlanOk

`func (o *NoticeEvent) GetPlanOk() (*PaidPlan, bool)`

GetPlanOk returns a tuple with the Plan field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPlan

`func (o *NoticeEvent) SetPlan(v PaidPlan)`

SetPlan sets Plan field to given value.


### GetPrice

`func (o *NoticeEvent) GetPrice() Money`

GetPrice returns the Price field if non-nil, zero value otherwise.

### GetPriceOk

`func (o *NoticeEvent) GetPriceOk() (*Money, bool)`

GetPriceOk returns a tuple with the Price field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPrice

`func (o *NoticeEvent) SetPrice(v Money)`

SetPrice sets Price field to given value.


### GetStartedAt

`func (o *NoticeEvent) GetStartedAt() string`

GetStartedAt returns the StartedAt field if non-nil, zero value otherwise.

### GetStartedAtOk

`func (o *NoticeEvent) GetStartedAtOk() (*string, bool)`

GetStartedAtOk returns a tuple with the StartedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStartedAt

`func (o *NoticeEvent) SetStartedAt(v string)`

SetStartedAt sets StartedAt field to given value.


### GetTrialEnd

`func (o *NoticeEvent) GetTrialEnd() string`

GetTrialEnd returns the TrialEnd field if non-nil, zero value otherwise.

### GetTrialEndOk

`func (o *NoticeEvent) GetTrialEndOk() (*string, bool)`

GetTrialEndOk returns a tuple with the TrialEnd field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTrialEnd

`func (o *NoticeEvent) SetTrialEnd(v string)`

SetTrialEnd sets TrialEnd field to given value.


### SetTrialEndNil

`func (o *NoticeEvent) SetTrialEndNil(b bool)`

 SetTrialEndNil sets the value for TrialEnd to be an explicit nil

### UnsetTrialEnd
`func (o *NoticeEvent) UnsetTrialEnd()`

UnsetTrialEnd ensures that no value is present for TrialEnd, not even an explicit nil
### GetEndsAt

`func (o *NoticeEvent) GetEndsAt() string`

GetEndsAt returns the EndsAt field if non-nil, zero value otherwise.

### GetEndsAtOk

`func (o *NoticeEvent) GetEndsAtOk() (*string, bool)`

GetEndsAtOk returns a tuple with the EndsAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEndsAt

`func (o *NoticeEvent) SetEndsAt(v string)`

SetEndsAt sets EndsAt field to given value.


### GetRenewsAt

`func (o *NoticeEvent) GetRenewsAt() string`

GetRenewsAt returns the RenewsAt field if non-nil, zero value otherwise.

### GetRenewsAtOk

`func (o *NoticeEvent) GetRenewsAtOk() (*string, bool)`

GetRenewsAtOk returns a tuple with the RenewsAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRenewsAt

`func (o *NoticeEvent) SetRenewsAt(v string)`

SetRenewsAt sets RenewsAt field to given value.


### GetRefunded

`func (o *NoticeEvent) GetRefunded() Money`

GetRefunded returns the Refunded field if non-nil, zero value otherwise.

### GetRefundedOk

`func (o *NoticeEvent) GetRefundedOk() (*Money, bool)`

GetRefundedOk returns a tuple with the Refunded field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRefunded

`func (o *NoticeEvent) SetRefunded(v Money)`

SetRefunded sets Refunded field to given value.


### GetWithdrawnAt

`func (o *NoticeEvent) GetWithdrawnAt() string`

GetWithdrawnAt returns the WithdrawnAt field if non-nil, zero value otherwise.

### GetWithdrawnAtOk

`func (o *NoticeEvent) GetWithdrawnAtOk() (*string, bool)`

GetWithdrawnAtOk returns a tuple with the WithdrawnAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetWithdrawnAt

`func (o *NoticeEvent) SetWithdrawnAt(v string)`

SetWithdrawnAt sets WithdrawnAt field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


