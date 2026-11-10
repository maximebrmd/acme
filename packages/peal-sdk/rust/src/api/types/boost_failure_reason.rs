pub use crate::prelude::*;

/// Why a boost failed, with nothing spent: `accountUnusable`, the ad account cannot run ads now; `accountSpendCap`, its own cap leaves too little room; `ceilingExceeded` or `spendingOff`, the ceiling was lowered or spending turned off meanwhile; `currencyMismatch`; `budgetTooLow`, under the network's minimum; `postNotPromotable`, the post was deleted or cannot be shown as an ad; `permissionMissing`, the sign-in lacks a permission; `reconnectNeeded`, the network refused the sign-in; `networkUnavailable`, the network kept refusing for now; `refused`, for a reason of the network's own (`networkCode`); `spendingUnavailable`, the server no longer offers spending.
#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum BoostFailureReason {
    AccountUnusable,
    AccountSpendCap,
    CeilingExceeded,
    SpendingOff,
    CurrencyMismatch,
    BudgetTooLow,
    PostNotPromotable,
    PermissionMissing,
    ReconnectNeeded,
    NetworkUnavailable,
    Refused,
    SpendingUnavailable,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for BoostFailureReason {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::AccountUnusable => serializer.serialize_str("accountUnusable"),
            Self::AccountSpendCap => serializer.serialize_str("accountSpendCap"),
            Self::CeilingExceeded => serializer.serialize_str("ceilingExceeded"),
            Self::SpendingOff => serializer.serialize_str("spendingOff"),
            Self::CurrencyMismatch => serializer.serialize_str("currencyMismatch"),
            Self::BudgetTooLow => serializer.serialize_str("budgetTooLow"),
            Self::PostNotPromotable => serializer.serialize_str("postNotPromotable"),
            Self::PermissionMissing => serializer.serialize_str("permissionMissing"),
            Self::ReconnectNeeded => serializer.serialize_str("reconnectNeeded"),
            Self::NetworkUnavailable => serializer.serialize_str("networkUnavailable"),
            Self::Refused => serializer.serialize_str("refused"),
            Self::SpendingUnavailable => serializer.serialize_str("spendingUnavailable"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for BoostFailureReason {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "accountUnusable" => Ok(Self::AccountUnusable),
            "accountSpendCap" => Ok(Self::AccountSpendCap),
            "ceilingExceeded" => Ok(Self::CeilingExceeded),
            "spendingOff" => Ok(Self::SpendingOff),
            "currencyMismatch" => Ok(Self::CurrencyMismatch),
            "budgetTooLow" => Ok(Self::BudgetTooLow),
            "postNotPromotable" => Ok(Self::PostNotPromotable),
            "permissionMissing" => Ok(Self::PermissionMissing),
            "reconnectNeeded" => Ok(Self::ReconnectNeeded),
            "networkUnavailable" => Ok(Self::NetworkUnavailable),
            "refused" => Ok(Self::Refused),
            "spendingUnavailable" => Ok(Self::SpendingUnavailable),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for BoostFailureReason {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::AccountUnusable => write!(f, "accountUnusable"),
            Self::AccountSpendCap => write!(f, "accountSpendCap"),
            Self::CeilingExceeded => write!(f, "ceilingExceeded"),
            Self::SpendingOff => write!(f, "spendingOff"),
            Self::CurrencyMismatch => write!(f, "currencyMismatch"),
            Self::BudgetTooLow => write!(f, "budgetTooLow"),
            Self::PostNotPromotable => write!(f, "postNotPromotable"),
            Self::PermissionMissing => write!(f, "permissionMissing"),
            Self::ReconnectNeeded => write!(f, "reconnectNeeded"),
            Self::NetworkUnavailable => write!(f, "networkUnavailable"),
            Self::Refused => write!(f, "refused"),
            Self::SpendingUnavailable => write!(f, "spendingUnavailable"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
