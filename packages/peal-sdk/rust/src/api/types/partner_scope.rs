pub use crate::prelude::*;

/// What a partner key may do with its partner's workspaces.
#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum PartnerScope {
    WorkspacesRead,
    WorkspacesWrite,
    WorkspacesDelete,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for PartnerScope {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::WorkspacesRead => serializer.serialize_str("workspaces:read"),
            Self::WorkspacesWrite => serializer.serialize_str("workspaces:write"),
            Self::WorkspacesDelete => serializer.serialize_str("workspaces:delete"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for PartnerScope {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "workspaces:read" => Ok(Self::WorkspacesRead),
            "workspaces:write" => Ok(Self::WorkspacesWrite),
            "workspaces:delete" => Ok(Self::WorkspacesDelete),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for PartnerScope {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::WorkspacesRead => write!(f, "workspaces:read"),
            Self::WorkspacesWrite => write!(f, "workspaces:write"),
            Self::WorkspacesDelete => write!(f, "workspaces:delete"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
