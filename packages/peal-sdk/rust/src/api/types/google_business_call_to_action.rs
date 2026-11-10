pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum GoogleBusinessCallToAction {
    Book,
    Order,
    Shop,
    LearnMore,
    SignUp,
    Call,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for GoogleBusinessCallToAction {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Book => serializer.serialize_str("book"),
            Self::Order => serializer.serialize_str("order"),
            Self::Shop => serializer.serialize_str("shop"),
            Self::LearnMore => serializer.serialize_str("learnMore"),
            Self::SignUp => serializer.serialize_str("signUp"),
            Self::Call => serializer.serialize_str("call"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for GoogleBusinessCallToAction {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "book" => Ok(Self::Book),
            "order" => Ok(Self::Order),
            "shop" => Ok(Self::Shop),
            "learnMore" => Ok(Self::LearnMore),
            "signUp" => Ok(Self::SignUp),
            "call" => Ok(Self::Call),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for GoogleBusinessCallToAction {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Book => write!(f, "book"),
            Self::Order => write!(f, "order"),
            Self::Shop => write!(f, "shop"),
            Self::LearnMore => write!(f, "learnMore"),
            Self::SignUp => write!(f, "signUp"),
            Self::Call => write!(f, "call"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
