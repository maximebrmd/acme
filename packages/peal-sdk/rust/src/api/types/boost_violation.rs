pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum BoostViolation {
    CurrencyMismatch,
    BudgetEmpty,
    EndsBeforeStart,
    RunTooShort,
    RunTooLong,
    StartsTooFarAhead,
    AgeRange,
    SpecialCategory,
    BeneficiaryRequired,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for BoostViolation {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::CurrencyMismatch => serializer.serialize_str("currencyMismatch"),
            Self::BudgetEmpty => serializer.serialize_str("budgetEmpty"),
            Self::EndsBeforeStart => serializer.serialize_str("endsBeforeStart"),
            Self::RunTooShort => serializer.serialize_str("runTooShort"),
            Self::RunTooLong => serializer.serialize_str("runTooLong"),
            Self::StartsTooFarAhead => serializer.serialize_str("startsTooFarAhead"),
            Self::AgeRange => serializer.serialize_str("ageRange"),
            Self::SpecialCategory => serializer.serialize_str("specialCategory"),
            Self::BeneficiaryRequired => serializer.serialize_str("beneficiaryRequired"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for BoostViolation {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "currencyMismatch" => Ok(Self::CurrencyMismatch),
            "budgetEmpty" => Ok(Self::BudgetEmpty),
            "endsBeforeStart" => Ok(Self::EndsBeforeStart),
            "runTooShort" => Ok(Self::RunTooShort),
            "runTooLong" => Ok(Self::RunTooLong),
            "startsTooFarAhead" => Ok(Self::StartsTooFarAhead),
            "ageRange" => Ok(Self::AgeRange),
            "specialCategory" => Ok(Self::SpecialCategory),
            "beneficiaryRequired" => Ok(Self::BeneficiaryRequired),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for BoostViolation {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::CurrencyMismatch => write!(f, "currencyMismatch"),
            Self::BudgetEmpty => write!(f, "budgetEmpty"),
            Self::EndsBeforeStart => write!(f, "endsBeforeStart"),
            Self::RunTooShort => write!(f, "runTooShort"),
            Self::RunTooLong => write!(f, "runTooLong"),
            Self::StartsTooFarAhead => write!(f, "startsTooFarAhead"),
            Self::AgeRange => write!(f, "ageRange"),
            Self::SpecialCategory => write!(f, "specialCategory"),
            Self::BeneficiaryRequired => write!(f, "beneficiaryRequired"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
