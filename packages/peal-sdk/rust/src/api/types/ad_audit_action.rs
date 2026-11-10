pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum AdAuditAction {
    AccountConnected,
    AccountDisconnected,
    SpendingEnabled,
    SpendingDisabled,
    CeilingChanged,
    BoostRequested,
    BoostStarted,
    BoostUnconfirmed,
    BoostFailed,
    BoostPaused,
    BoostResumed,
    BoostStopped,
    BoostEnded,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for AdAuditAction {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::AccountConnected => serializer.serialize_str("accountConnected"),
            Self::AccountDisconnected => serializer.serialize_str("accountDisconnected"),
            Self::SpendingEnabled => serializer.serialize_str("spendingEnabled"),
            Self::SpendingDisabled => serializer.serialize_str("spendingDisabled"),
            Self::CeilingChanged => serializer.serialize_str("ceilingChanged"),
            Self::BoostRequested => serializer.serialize_str("boostRequested"),
            Self::BoostStarted => serializer.serialize_str("boostStarted"),
            Self::BoostUnconfirmed => serializer.serialize_str("boostUnconfirmed"),
            Self::BoostFailed => serializer.serialize_str("boostFailed"),
            Self::BoostPaused => serializer.serialize_str("boostPaused"),
            Self::BoostResumed => serializer.serialize_str("boostResumed"),
            Self::BoostStopped => serializer.serialize_str("boostStopped"),
            Self::BoostEnded => serializer.serialize_str("boostEnded"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for AdAuditAction {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "accountConnected" => Ok(Self::AccountConnected),
            "accountDisconnected" => Ok(Self::AccountDisconnected),
            "spendingEnabled" => Ok(Self::SpendingEnabled),
            "spendingDisabled" => Ok(Self::SpendingDisabled),
            "ceilingChanged" => Ok(Self::CeilingChanged),
            "boostRequested" => Ok(Self::BoostRequested),
            "boostStarted" => Ok(Self::BoostStarted),
            "boostUnconfirmed" => Ok(Self::BoostUnconfirmed),
            "boostFailed" => Ok(Self::BoostFailed),
            "boostPaused" => Ok(Self::BoostPaused),
            "boostResumed" => Ok(Self::BoostResumed),
            "boostStopped" => Ok(Self::BoostStopped),
            "boostEnded" => Ok(Self::BoostEnded),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for AdAuditAction {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::AccountConnected => write!(f, "accountConnected"),
            Self::AccountDisconnected => write!(f, "accountDisconnected"),
            Self::SpendingEnabled => write!(f, "spendingEnabled"),
            Self::SpendingDisabled => write!(f, "spendingDisabled"),
            Self::CeilingChanged => write!(f, "ceilingChanged"),
            Self::BoostRequested => write!(f, "boostRequested"),
            Self::BoostStarted => write!(f, "boostStarted"),
            Self::BoostUnconfirmed => write!(f, "boostUnconfirmed"),
            Self::BoostFailed => write!(f, "boostFailed"),
            Self::BoostPaused => write!(f, "boostPaused"),
            Self::BoostResumed => write!(f, "boostResumed"),
            Self::BoostStopped => write!(f, "boostStopped"),
            Self::BoostEnded => write!(f, "boostEnded"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
