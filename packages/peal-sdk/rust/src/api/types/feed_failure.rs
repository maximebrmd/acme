pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum FeedFailure {
    Timeout,
    RateLimited,
    ServerError,
    NotFound,
    Gone,
    NotAFeed,
    TooLarge,
    Refused,
    Unreachable,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for FeedFailure {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Timeout => serializer.serialize_str("timeout"),
            Self::RateLimited => serializer.serialize_str("rateLimited"),
            Self::ServerError => serializer.serialize_str("serverError"),
            Self::NotFound => serializer.serialize_str("notFound"),
            Self::Gone => serializer.serialize_str("gone"),
            Self::NotAFeed => serializer.serialize_str("notAFeed"),
            Self::TooLarge => serializer.serialize_str("tooLarge"),
            Self::Refused => serializer.serialize_str("refused"),
            Self::Unreachable => serializer.serialize_str("unreachable"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for FeedFailure {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "timeout" => Ok(Self::Timeout),
            "rateLimited" => Ok(Self::RateLimited),
            "serverError" => Ok(Self::ServerError),
            "notFound" => Ok(Self::NotFound),
            "gone" => Ok(Self::Gone),
            "notAFeed" => Ok(Self::NotAFeed),
            "tooLarge" => Ok(Self::TooLarge),
            "refused" => Ok(Self::Refused),
            "unreachable" => Ok(Self::Unreachable),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for FeedFailure {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Timeout => write!(f, "timeout"),
            Self::RateLimited => write!(f, "rateLimited"),
            Self::ServerError => write!(f, "serverError"),
            Self::NotFound => write!(f, "notFound"),
            Self::Gone => write!(f, "gone"),
            Self::NotAFeed => write!(f, "notAFeed"),
            Self::TooLarge => write!(f, "tooLarge"),
            Self::Refused => write!(f, "refused"),
            Self::Unreachable => write!(f, "unreachable"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
