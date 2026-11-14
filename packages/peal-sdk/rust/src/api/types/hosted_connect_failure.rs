pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum HostedConnectFailure {
    PlatformNotSupported,
    NotConfigured,
    InvalidInstance,
    InstanceNotAllowed,
    InvalidHandle,
    InvalidState,
    Denied,
    AuthorizationFailed,
    AccountMismatch,
    NoAccounts,
    LinkExpired,
    LinkCompleted,
    LinkRevoked,
    TooManyAttempts,
    PlanLimit,
    ChannelGone,
    PlatformUnreachable,
    PlatformNotOffered,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for HostedConnectFailure {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::PlatformNotSupported => serializer.serialize_str("platformNotSupported"),
            Self::NotConfigured => serializer.serialize_str("notConfigured"),
            Self::InvalidInstance => serializer.serialize_str("invalidInstance"),
            Self::InstanceNotAllowed => serializer.serialize_str("instanceNotAllowed"),
            Self::InvalidHandle => serializer.serialize_str("invalidHandle"),
            Self::InvalidState => serializer.serialize_str("invalidState"),
            Self::Denied => serializer.serialize_str("denied"),
            Self::AuthorizationFailed => serializer.serialize_str("authorizationFailed"),
            Self::AccountMismatch => serializer.serialize_str("accountMismatch"),
            Self::NoAccounts => serializer.serialize_str("noAccounts"),
            Self::LinkExpired => serializer.serialize_str("linkExpired"),
            Self::LinkCompleted => serializer.serialize_str("linkCompleted"),
            Self::LinkRevoked => serializer.serialize_str("linkRevoked"),
            Self::TooManyAttempts => serializer.serialize_str("tooManyAttempts"),
            Self::PlanLimit => serializer.serialize_str("planLimit"),
            Self::ChannelGone => serializer.serialize_str("channelGone"),
            Self::PlatformUnreachable => serializer.serialize_str("platformUnreachable"),
            Self::PlatformNotOffered => serializer.serialize_str("platformNotOffered"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for HostedConnectFailure {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "platformNotSupported" => Ok(Self::PlatformNotSupported),
            "notConfigured" => Ok(Self::NotConfigured),
            "invalidInstance" => Ok(Self::InvalidInstance),
            "instanceNotAllowed" => Ok(Self::InstanceNotAllowed),
            "invalidHandle" => Ok(Self::InvalidHandle),
            "invalidState" => Ok(Self::InvalidState),
            "denied" => Ok(Self::Denied),
            "authorizationFailed" => Ok(Self::AuthorizationFailed),
            "accountMismatch" => Ok(Self::AccountMismatch),
            "noAccounts" => Ok(Self::NoAccounts),
            "linkExpired" => Ok(Self::LinkExpired),
            "linkCompleted" => Ok(Self::LinkCompleted),
            "linkRevoked" => Ok(Self::LinkRevoked),
            "tooManyAttempts" => Ok(Self::TooManyAttempts),
            "planLimit" => Ok(Self::PlanLimit),
            "channelGone" => Ok(Self::ChannelGone),
            "platformUnreachable" => Ok(Self::PlatformUnreachable),
            "platformNotOffered" => Ok(Self::PlatformNotOffered),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for HostedConnectFailure {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::PlatformNotSupported => write!(f, "platformNotSupported"),
            Self::NotConfigured => write!(f, "notConfigured"),
            Self::InvalidInstance => write!(f, "invalidInstance"),
            Self::InstanceNotAllowed => write!(f, "instanceNotAllowed"),
            Self::InvalidHandle => write!(f, "invalidHandle"),
            Self::InvalidState => write!(f, "invalidState"),
            Self::Denied => write!(f, "denied"),
            Self::AuthorizationFailed => write!(f, "authorizationFailed"),
            Self::AccountMismatch => write!(f, "accountMismatch"),
            Self::NoAccounts => write!(f, "noAccounts"),
            Self::LinkExpired => write!(f, "linkExpired"),
            Self::LinkCompleted => write!(f, "linkCompleted"),
            Self::LinkRevoked => write!(f, "linkRevoked"),
            Self::TooManyAttempts => write!(f, "tooManyAttempts"),
            Self::PlanLimit => write!(f, "planLimit"),
            Self::ChannelGone => write!(f, "channelGone"),
            Self::PlatformUnreachable => write!(f, "platformUnreachable"),
            Self::PlatformNotOffered => write!(f, "platformNotOffered"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
