pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum NoticeEventAdBoostChangedChange {
    Started,
    Ended,
    Failed,
    BudgetReached,
    Unconfirmed,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for NoticeEventAdBoostChangedChange {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Started => serializer.serialize_str("started"),
            Self::Ended => serializer.serialize_str("ended"),
            Self::Failed => serializer.serialize_str("failed"),
            Self::BudgetReached => serializer.serialize_str("budgetReached"),
            Self::Unconfirmed => serializer.serialize_str("unconfirmed"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for NoticeEventAdBoostChangedChange {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "started" => Ok(Self::Started),
            "ended" => Ok(Self::Ended),
            "failed" => Ok(Self::Failed),
            "budgetReached" => Ok(Self::BudgetReached),
            "unconfirmed" => Ok(Self::Unconfirmed),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for NoticeEventAdBoostChangedChange {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Started => write!(f, "started"),
            Self::Ended => write!(f, "ended"),
            Self::Failed => write!(f, "failed"),
            Self::BudgetReached => write!(f, "budgetReached"),
            Self::Unconfirmed => write!(f, "unconfirmed"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
