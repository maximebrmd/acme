pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum ForbiddenReason {
    MissingScope,
    MissingPermission,
    PersonRequired,
    WrongWorkspace,
    Suspended,
    UntrustedOrigin,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for ForbiddenReason {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::MissingScope => serializer.serialize_str("missingScope"),
            Self::MissingPermission => serializer.serialize_str("missingPermission"),
            Self::PersonRequired => serializer.serialize_str("personRequired"),
            Self::WrongWorkspace => serializer.serialize_str("wrongWorkspace"),
            Self::Suspended => serializer.serialize_str("suspended"),
            Self::UntrustedOrigin => serializer.serialize_str("untrustedOrigin"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for ForbiddenReason {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "missingScope" => Ok(Self::MissingScope),
            "missingPermission" => Ok(Self::MissingPermission),
            "personRequired" => Ok(Self::PersonRequired),
            "wrongWorkspace" => Ok(Self::WrongWorkspace),
            "suspended" => Ok(Self::Suspended),
            "untrustedOrigin" => Ok(Self::UntrustedOrigin),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for ForbiddenReason {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::MissingScope => write!(f, "missingScope"),
            Self::MissingPermission => write!(f, "missingPermission"),
            Self::PersonRequired => write!(f, "personRequired"),
            Self::WrongWorkspace => write!(f, "wrongWorkspace"),
            Self::Suspended => write!(f, "suspended"),
            Self::UntrustedOrigin => write!(f, "untrustedOrigin"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
