pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum ChannelStatusName {
    Active,
    RefreshNeeded,
    Disabled,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for ChannelStatusName {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Active => serializer.serialize_str("active"),
            Self::RefreshNeeded => serializer.serialize_str("refreshNeeded"),
            Self::Disabled => serializer.serialize_str("disabled"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for ChannelStatusName {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "active" => Ok(Self::Active),
            "refreshNeeded" => Ok(Self::RefreshNeeded),
            "disabled" => Ok(Self::Disabled),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for ChannelStatusName {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Active => write!(f, "active"),
            Self::RefreshNeeded => write!(f, "refreshNeeded"),
            Self::Disabled => write!(f, "disabled"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
