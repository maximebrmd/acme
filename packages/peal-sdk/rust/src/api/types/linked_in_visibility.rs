pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum LinkedInVisibility {
    Public,
    Connections,
    LoggedIn,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for LinkedInVisibility {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Public => serializer.serialize_str("public"),
            Self::Connections => serializer.serialize_str("connections"),
            Self::LoggedIn => serializer.serialize_str("loggedIn"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for LinkedInVisibility {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "public" => Ok(Self::Public),
            "connections" => Ok(Self::Connections),
            "loggedIn" => Ok(Self::LoggedIn),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for LinkedInVisibility {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Public => write!(f, "public"),
            Self::Connections => write!(f, "connections"),
            Self::LoggedIn => write!(f, "loggedIn"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
