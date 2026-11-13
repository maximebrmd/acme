pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum AllowanceReason {
    PaymentMethodRequired,
    CeilingReached,
    NotEnabled,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for AllowanceReason {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::PaymentMethodRequired => serializer.serialize_str("paymentMethodRequired"),
            Self::CeilingReached => serializer.serialize_str("ceilingReached"),
            Self::NotEnabled => serializer.serialize_str("notEnabled"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for AllowanceReason {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "paymentMethodRequired" => Ok(Self::PaymentMethodRequired),
            "ceilingReached" => Ok(Self::CeilingReached),
            "notEnabled" => Ok(Self::NotEnabled),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for AllowanceReason {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::PaymentMethodRequired => write!(f, "paymentMethodRequired"),
            Self::CeilingReached => write!(f, "ceilingReached"),
            Self::NotEnabled => write!(f, "notEnabled"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
