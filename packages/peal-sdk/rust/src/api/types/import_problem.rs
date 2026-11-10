pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum ImportProblem {
    Empty,
    UnterminatedQuote,
    StrayQuote,
    UnknownColumn,
    RepeatedColumn,
    MissingColumn,
    TooManyRows,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for ImportProblem {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Empty => serializer.serialize_str("empty"),
            Self::UnterminatedQuote => serializer.serialize_str("unterminatedQuote"),
            Self::StrayQuote => serializer.serialize_str("strayQuote"),
            Self::UnknownColumn => serializer.serialize_str("unknownColumn"),
            Self::RepeatedColumn => serializer.serialize_str("repeatedColumn"),
            Self::MissingColumn => serializer.serialize_str("missingColumn"),
            Self::TooManyRows => serializer.serialize_str("tooManyRows"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for ImportProblem {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "empty" => Ok(Self::Empty),
            "unterminatedQuote" => Ok(Self::UnterminatedQuote),
            "strayQuote" => Ok(Self::StrayQuote),
            "unknownColumn" => Ok(Self::UnknownColumn),
            "repeatedColumn" => Ok(Self::RepeatedColumn),
            "missingColumn" => Ok(Self::MissingColumn),
            "tooManyRows" => Ok(Self::TooManyRows),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for ImportProblem {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Empty => write!(f, "empty"),
            Self::UnterminatedQuote => write!(f, "unterminatedQuote"),
            Self::StrayQuote => write!(f, "strayQuote"),
            Self::UnknownColumn => write!(f, "unknownColumn"),
            Self::RepeatedColumn => write!(f, "repeatedColumn"),
            Self::MissingColumn => write!(f, "missingColumn"),
            Self::TooManyRows => write!(f, "tooManyRows"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
