pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum MediaSourceFailure {
    UnknownHost,
    NoAnswer,
    BadStatus,
    TooManyRedirects,
    TooSlow,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for MediaSourceFailure {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::UnknownHost => serializer.serialize_str("unknownHost"),
            Self::NoAnswer => serializer.serialize_str("noAnswer"),
            Self::BadStatus => serializer.serialize_str("badStatus"),
            Self::TooManyRedirects => serializer.serialize_str("tooManyRedirects"),
            Self::TooSlow => serializer.serialize_str("tooSlow"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for MediaSourceFailure {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "unknownHost" => Ok(Self::UnknownHost),
            "noAnswer" => Ok(Self::NoAnswer),
            "badStatus" => Ok(Self::BadStatus),
            "tooManyRedirects" => Ok(Self::TooManyRedirects),
            "tooSlow" => Ok(Self::TooSlow),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for MediaSourceFailure {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::UnknownHost => write!(f, "unknownHost"),
            Self::NoAnswer => write!(f, "noAnswer"),
            Self::BadStatus => write!(f, "badStatus"),
            Self::TooManyRedirects => write!(f, "tooManyRedirects"),
            Self::TooSlow => write!(f, "tooSlow"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
