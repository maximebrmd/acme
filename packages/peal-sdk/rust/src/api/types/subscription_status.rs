pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum SubscriptionStatus {
    Incomplete,
    IncompleteExpired,
    Trialing,
    Active,
    PastDue,
    Canceled,
    Unpaid,
    Paused,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for SubscriptionStatus {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Incomplete => serializer.serialize_str("incomplete"),
            Self::IncompleteExpired => serializer.serialize_str("incomplete_expired"),
            Self::Trialing => serializer.serialize_str("trialing"),
            Self::Active => serializer.serialize_str("active"),
            Self::PastDue => serializer.serialize_str("past_due"),
            Self::Canceled => serializer.serialize_str("canceled"),
            Self::Unpaid => serializer.serialize_str("unpaid"),
            Self::Paused => serializer.serialize_str("paused"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for SubscriptionStatus {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "incomplete" => Ok(Self::Incomplete),
            "incomplete_expired" => Ok(Self::IncompleteExpired),
            "trialing" => Ok(Self::Trialing),
            "active" => Ok(Self::Active),
            "past_due" => Ok(Self::PastDue),
            "canceled" => Ok(Self::Canceled),
            "unpaid" => Ok(Self::Unpaid),
            "paused" => Ok(Self::Paused),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for SubscriptionStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Incomplete => write!(f, "incomplete"),
            Self::IncompleteExpired => write!(f, "incomplete_expired"),
            Self::Trialing => write!(f, "trialing"),
            Self::Active => write!(f, "active"),
            Self::PastDue => write!(f, "past_due"),
            Self::Canceled => write!(f, "canceled"),
            Self::Unpaid => write!(f, "unpaid"),
            Self::Paused => write!(f, "paused"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
