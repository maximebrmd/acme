pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum TagColour {
    Gray,
    Red,
    Orange,
    Amber,
    Green,
    Teal,
    Blue,
    Purple,
    Pink,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for TagColour {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Gray => serializer.serialize_str("gray"),
            Self::Red => serializer.serialize_str("red"),
            Self::Orange => serializer.serialize_str("orange"),
            Self::Amber => serializer.serialize_str("amber"),
            Self::Green => serializer.serialize_str("green"),
            Self::Teal => serializer.serialize_str("teal"),
            Self::Blue => serializer.serialize_str("blue"),
            Self::Purple => serializer.serialize_str("purple"),
            Self::Pink => serializer.serialize_str("pink"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for TagColour {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "gray" => Ok(Self::Gray),
            "red" => Ok(Self::Red),
            "orange" => Ok(Self::Orange),
            "amber" => Ok(Self::Amber),
            "green" => Ok(Self::Green),
            "teal" => Ok(Self::Teal),
            "blue" => Ok(Self::Blue),
            "purple" => Ok(Self::Purple),
            "pink" => Ok(Self::Pink),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for TagColour {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Gray => write!(f, "gray"),
            Self::Red => write!(f, "red"),
            Self::Orange => write!(f, "orange"),
            Self::Amber => write!(f, "amber"),
            Self::Green => write!(f, "green"),
            Self::Teal => write!(f, "teal"),
            Self::Blue => write!(f, "blue"),
            Self::Purple => write!(f, "purple"),
            Self::Pink => write!(f, "pink"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
