pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum MastodonQuotePolicy {
    Public,
    Followers,
    Nobody,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for MastodonQuotePolicy {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Public => serializer.serialize_str("public"),
            Self::Followers => serializer.serialize_str("followers"),
            Self::Nobody => serializer.serialize_str("nobody"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for MastodonQuotePolicy {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "public" => Ok(Self::Public),
            "followers" => Ok(Self::Followers),
            "nobody" => Ok(Self::Nobody),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for MastodonQuotePolicy {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Public => write!(f, "public"),
            Self::Followers => write!(f, "followers"),
            Self::Nobody => write!(f, "nobody"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
