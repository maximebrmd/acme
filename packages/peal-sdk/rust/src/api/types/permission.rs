pub use crate::prelude::*;

/// One action on one resource of a workspace.
#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum Permission {
    AnalyticsRead,
    ApiKeyCreate,
    ApiKeyRead,
    ApiKeyUpdate,
    ApiKeyDelete,
    AssistantUse,
    BillingRead,
    BillingManage,
    ChannelRead,
    ChannelConnect,
    ChannelDisconnect,
    InvitationCreate,
    InvitationCancel,
    MediaRead,
    MediaUpload,
    MediaDelete,
    MemberCreate,
    MemberUpdate,
    MemberDelete,
    OrganizationUpdate,
    OrganizationDelete,
    PostRead,
    PostCreate,
    PostUpdate,
    PostDelete,
    PostSchedule,
    PostApprove,
    PostPublish,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for Permission {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::AnalyticsRead => serializer.serialize_str("analytics:read"),
            Self::ApiKeyCreate => serializer.serialize_str("apiKey:create"),
            Self::ApiKeyRead => serializer.serialize_str("apiKey:read"),
            Self::ApiKeyUpdate => serializer.serialize_str("apiKey:update"),
            Self::ApiKeyDelete => serializer.serialize_str("apiKey:delete"),
            Self::AssistantUse => serializer.serialize_str("assistant:use"),
            Self::BillingRead => serializer.serialize_str("billing:read"),
            Self::BillingManage => serializer.serialize_str("billing:manage"),
            Self::ChannelRead => serializer.serialize_str("channel:read"),
            Self::ChannelConnect => serializer.serialize_str("channel:connect"),
            Self::ChannelDisconnect => serializer.serialize_str("channel:disconnect"),
            Self::InvitationCreate => serializer.serialize_str("invitation:create"),
            Self::InvitationCancel => serializer.serialize_str("invitation:cancel"),
            Self::MediaRead => serializer.serialize_str("media:read"),
            Self::MediaUpload => serializer.serialize_str("media:upload"),
            Self::MediaDelete => serializer.serialize_str("media:delete"),
            Self::MemberCreate => serializer.serialize_str("member:create"),
            Self::MemberUpdate => serializer.serialize_str("member:update"),
            Self::MemberDelete => serializer.serialize_str("member:delete"),
            Self::OrganizationUpdate => serializer.serialize_str("organization:update"),
            Self::OrganizationDelete => serializer.serialize_str("organization:delete"),
            Self::PostRead => serializer.serialize_str("post:read"),
            Self::PostCreate => serializer.serialize_str("post:create"),
            Self::PostUpdate => serializer.serialize_str("post:update"),
            Self::PostDelete => serializer.serialize_str("post:delete"),
            Self::PostSchedule => serializer.serialize_str("post:schedule"),
            Self::PostApprove => serializer.serialize_str("post:approve"),
            Self::PostPublish => serializer.serialize_str("post:publish"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for Permission {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "analytics:read" => Ok(Self::AnalyticsRead),
            "apiKey:create" => Ok(Self::ApiKeyCreate),
            "apiKey:read" => Ok(Self::ApiKeyRead),
            "apiKey:update" => Ok(Self::ApiKeyUpdate),
            "apiKey:delete" => Ok(Self::ApiKeyDelete),
            "assistant:use" => Ok(Self::AssistantUse),
            "billing:read" => Ok(Self::BillingRead),
            "billing:manage" => Ok(Self::BillingManage),
            "channel:read" => Ok(Self::ChannelRead),
            "channel:connect" => Ok(Self::ChannelConnect),
            "channel:disconnect" => Ok(Self::ChannelDisconnect),
            "invitation:create" => Ok(Self::InvitationCreate),
            "invitation:cancel" => Ok(Self::InvitationCancel),
            "media:read" => Ok(Self::MediaRead),
            "media:upload" => Ok(Self::MediaUpload),
            "media:delete" => Ok(Self::MediaDelete),
            "member:create" => Ok(Self::MemberCreate),
            "member:update" => Ok(Self::MemberUpdate),
            "member:delete" => Ok(Self::MemberDelete),
            "organization:update" => Ok(Self::OrganizationUpdate),
            "organization:delete" => Ok(Self::OrganizationDelete),
            "post:read" => Ok(Self::PostRead),
            "post:create" => Ok(Self::PostCreate),
            "post:update" => Ok(Self::PostUpdate),
            "post:delete" => Ok(Self::PostDelete),
            "post:schedule" => Ok(Self::PostSchedule),
            "post:approve" => Ok(Self::PostApprove),
            "post:publish" => Ok(Self::PostPublish),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for Permission {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::AnalyticsRead => write!(f, "analytics:read"),
            Self::ApiKeyCreate => write!(f, "apiKey:create"),
            Self::ApiKeyRead => write!(f, "apiKey:read"),
            Self::ApiKeyUpdate => write!(f, "apiKey:update"),
            Self::ApiKeyDelete => write!(f, "apiKey:delete"),
            Self::AssistantUse => write!(f, "assistant:use"),
            Self::BillingRead => write!(f, "billing:read"),
            Self::BillingManage => write!(f, "billing:manage"),
            Self::ChannelRead => write!(f, "channel:read"),
            Self::ChannelConnect => write!(f, "channel:connect"),
            Self::ChannelDisconnect => write!(f, "channel:disconnect"),
            Self::InvitationCreate => write!(f, "invitation:create"),
            Self::InvitationCancel => write!(f, "invitation:cancel"),
            Self::MediaRead => write!(f, "media:read"),
            Self::MediaUpload => write!(f, "media:upload"),
            Self::MediaDelete => write!(f, "media:delete"),
            Self::MemberCreate => write!(f, "member:create"),
            Self::MemberUpdate => write!(f, "member:update"),
            Self::MemberDelete => write!(f, "member:delete"),
            Self::OrganizationUpdate => write!(f, "organization:update"),
            Self::OrganizationDelete => write!(f, "organization:delete"),
            Self::PostRead => write!(f, "post:read"),
            Self::PostCreate => write!(f, "post:create"),
            Self::PostUpdate => write!(f, "post:update"),
            Self::PostDelete => write!(f, "post:delete"),
            Self::PostSchedule => write!(f, "post:schedule"),
            Self::PostApprove => write!(f, "post:approve"),
            Self::PostPublish => write!(f, "post:publish"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
