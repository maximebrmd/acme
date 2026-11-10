pub use crate::prelude::*;

/// Where an ad account stands at its network: `active` can run ads; `inGracePeriod` still runs, with a payment to settle; `unsettled` has a failed payment; `pendingReview` is being checked; `disabled` was turned off by the network; `closed`; `unknown` is a status Peal does not know yet. Only `active` takes a new boost.
#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum AdAccountStatus {
    Active,
    InGracePeriod,
    Unsettled,
    PendingReview,
    Disabled,
    Closed,
    Unknown,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for AdAccountStatus {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Active => serializer.serialize_str("active"),
            Self::InGracePeriod => serializer.serialize_str("inGracePeriod"),
            Self::Unsettled => serializer.serialize_str("unsettled"),
            Self::PendingReview => serializer.serialize_str("pendingReview"),
            Self::Disabled => serializer.serialize_str("disabled"),
            Self::Closed => serializer.serialize_str("closed"),
            Self::Unknown => serializer.serialize_str("unknown"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for AdAccountStatus {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "active" => Ok(Self::Active),
            "inGracePeriod" => Ok(Self::InGracePeriod),
            "unsettled" => Ok(Self::Unsettled),
            "pendingReview" => Ok(Self::PendingReview),
            "disabled" => Ok(Self::Disabled),
            "closed" => Ok(Self::Closed),
            "unknown" => Ok(Self::Unknown),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for AdAccountStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Active => write!(f, "active"),
            Self::InGracePeriod => write!(f, "inGracePeriod"),
            Self::Unsettled => write!(f, "unsettled"),
            Self::PendingReview => write!(f, "pendingReview"),
            Self::Disabled => write!(f, "disabled"),
            Self::Closed => write!(f, "closed"),
            Self::Unknown => write!(f, "unknown"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
