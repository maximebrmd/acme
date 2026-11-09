# ConnectablePlatforms

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**InstagramConnections** | [**[]InstagramConnection**](InstagramConnection.md) |  | 
**Platforms** | [**[]Platform**](Platform.md) |  | 

## Methods

### NewConnectablePlatforms

`func NewConnectablePlatforms(instagramConnections []InstagramConnection, platforms []Platform, ) *ConnectablePlatforms`

NewConnectablePlatforms instantiates a new ConnectablePlatforms object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewConnectablePlatformsWithDefaults

`func NewConnectablePlatformsWithDefaults() *ConnectablePlatforms`

NewConnectablePlatformsWithDefaults instantiates a new ConnectablePlatforms object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetInstagramConnections

`func (o *ConnectablePlatforms) GetInstagramConnections() []InstagramConnection`

GetInstagramConnections returns the InstagramConnections field if non-nil, zero value otherwise.

### GetInstagramConnectionsOk

`func (o *ConnectablePlatforms) GetInstagramConnectionsOk() (*[]InstagramConnection, bool)`

GetInstagramConnectionsOk returns a tuple with the InstagramConnections field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetInstagramConnections

`func (o *ConnectablePlatforms) SetInstagramConnections(v []InstagramConnection)`

SetInstagramConnections sets InstagramConnections field to given value.


### GetPlatforms

`func (o *ConnectablePlatforms) GetPlatforms() []Platform`

GetPlatforms returns the Platforms field if non-nil, zero value otherwise.

### GetPlatformsOk

`func (o *ConnectablePlatforms) GetPlatformsOk() (*[]Platform, bool)`

GetPlatformsOk returns a tuple with the Platforms field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPlatforms

`func (o *ConnectablePlatforms) SetPlatforms(v []Platform)`

SetPlatforms sets Platforms field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


