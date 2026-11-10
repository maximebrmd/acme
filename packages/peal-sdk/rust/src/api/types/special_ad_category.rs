pub use crate::prelude::*;

/// What the advertiser declares the ad is about. Peal boosts `none` only: an ad about housing, employment, financial products and services, or social issues, elections or politics is refused, as each restricts targeting in ways Peal does not handle.
#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum SpecialAdCategory {
    None,
    Housing,
    Employment,
    FinancialProductsServices,
    IssuesElectionsPolitics,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for SpecialAdCategory {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::None => serializer.serialize_str("none"),
            Self::Housing => serializer.serialize_str("housing"),
            Self::Employment => serializer.serialize_str("employment"),
            Self::FinancialProductsServices => {
                serializer.serialize_str("financialProductsServices")
            }
            Self::IssuesElectionsPolitics => serializer.serialize_str("issuesElectionsPolitics"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for SpecialAdCategory {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "none" => Ok(Self::None),
            "housing" => Ok(Self::Housing),
            "employment" => Ok(Self::Employment),
            "financialProductsServices" => Ok(Self::FinancialProductsServices),
            "issuesElectionsPolitics" => Ok(Self::IssuesElectionsPolitics),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for SpecialAdCategory {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::None => write!(f, "none"),
            Self::Housing => write!(f, "housing"),
            Self::Employment => write!(f, "employment"),
            Self::FinancialProductsServices => write!(f, "financialProductsServices"),
            Self::IssuesElectionsPolitics => write!(f, "issuesElectionsPolitics"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
