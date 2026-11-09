pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum ConnectFailureReason {
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
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for ConnectFailureReason {
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
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for ConnectFailureReason {
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
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for ConnectFailureReason {
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
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
