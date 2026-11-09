pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum Role {
    Owner,
    Admin,
    Editor,
    Contributor,
    Viewer,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for Role {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Owner => serializer.serialize_str("owner"),
            Self::Admin => serializer.serialize_str("admin"),
            Self::Editor => serializer.serialize_str("editor"),
            Self::Contributor => serializer.serialize_str("contributor"),
            Self::Viewer => serializer.serialize_str("viewer"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for Role {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "owner" => Ok(Self::Owner),
            "admin" => Ok(Self::Admin),
            "editor" => Ok(Self::Editor),
            "contributor" => Ok(Self::Contributor),
            "viewer" => Ok(Self::Viewer),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for Role {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Owner => write!(f, "owner"),
            Self::Admin => write!(f, "admin"),
            Self::Editor => write!(f, "editor"),
            Self::Contributor => write!(f, "contributor"),
            Self::Viewer => write!(f, "viewer"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
