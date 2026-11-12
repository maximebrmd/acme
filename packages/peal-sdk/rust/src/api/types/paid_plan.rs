pub use crate::prelude::*;

/// The plan a subscription buys: `starter`, `pro`, `business` and `agency`, the plans priced by tiers of connected channels, kept for the subscriptions that hold one; `payAsYouGo`, pricing per connected account and per use, which no subscription holds yet.
#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum PaidPlan {
    Starter,
    Pro,
    Business,
    Agency,
    PayAsYouGo,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for PaidPlan {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Starter => serializer.serialize_str("starter"),
            Self::Pro => serializer.serialize_str("pro"),
            Self::Business => serializer.serialize_str("business"),
            Self::Agency => serializer.serialize_str("agency"),
            Self::PayAsYouGo => serializer.serialize_str("payAsYouGo"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for PaidPlan {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "starter" => Ok(Self::Starter),
            "pro" => Ok(Self::Pro),
            "business" => Ok(Self::Business),
            "agency" => Ok(Self::Agency),
            "payAsYouGo" => Ok(Self::PayAsYouGo),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for PaidPlan {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Starter => write!(f, "starter"),
            Self::Pro => write!(f, "pro"),
            Self::Business => write!(f, "business"),
            Self::Agency => write!(f, "agency"),
            Self::PayAsYouGo => write!(f, "payAsYouGo"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
