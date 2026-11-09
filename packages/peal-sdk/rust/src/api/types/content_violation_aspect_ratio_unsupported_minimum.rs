pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(untagged)]
pub enum ContentViolationAspectRatioUnsupportedMinimum {
    Double(f64),

    NonFiniteNumber(NonFiniteNumber),
}

impl ContentViolationAspectRatioUnsupportedMinimum {
    pub fn is_double(&self) -> bool {
        matches!(self, Self::Double(_))
    }

    pub fn is_non_finite_number(&self) -> bool {
        matches!(self, Self::NonFiniteNumber(_))
    }

    pub fn as_double(&self) -> Option<&f64> {
        match self {
            Self::Double(value) => Some(value),
            _ => None,
        }
    }

    pub fn into_double(self) -> Option<f64> {
        match self {
            Self::Double(value) => Some(value),
            _ => None,
        }
    }

    pub fn as_non_finite_number(&self) -> Option<&NonFiniteNumber> {
        match self {
            Self::NonFiniteNumber(value) => Some(value),
            _ => None,
        }
    }

    pub fn into_non_finite_number(self) -> Option<NonFiniteNumber> {
        match self {
            Self::NonFiniteNumber(value) => Some(value),
            _ => None,
        }
    }
}

impl fmt::Display for ContentViolationAspectRatioUnsupportedMinimum {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Double(value) => write!(f, "{}", value),
            Self::NonFiniteNumber(value) => write!(
                f,
                "{}",
                serde_json::to_string(value).unwrap_or_else(|_| format!("{:?}", value))
            ),
        }
    }
}
